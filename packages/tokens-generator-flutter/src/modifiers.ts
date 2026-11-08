import {
  isObject,
  parseAlias,
  type ResolverModifier,
  type Token,
  type TokenDocument,
} from "@hommel/tokens-generator";

import { camelCase, pascalCase } from "./dart.ts";
import { dartType, toDart, type RefFn } from "./values.ts";

export interface TokenClassification {
  /** token id -> name of the modifier whose context sources directly declare it */
  ownerModifier: Map<string, string>;
  /** ids whose resolved value depends (directly, or transitively through aliases) on a modifier selection */
  dynamic: Set<string>;
}

/** classifies every token as "static" (same value regardless of modifiers) or "dynamic" */
export function classifyTokens(document: TokenDocument): TokenClassification {
  const ownerModifier = new Map<string, string>();
  for (const modifier of document.modifiers) {
    for (const tokens of Object.values(modifier.contexts)) {
      for (const id of tokens.keys()) {
        if (!ownerModifier.has(id)) ownerModifier.set(id, modifier.name);
      }
    }
  }
  const dynamic = new Set<string>(ownerModifier.keys());
  const defaultTokens = document.defaultTokens;
  const visiting = new Set<string>();

  function collectAliasIds(value: unknown, ids: Set<string>): void {
    const alias = parseAlias(value);
    if (alias !== undefined) {
      ids.add(alias);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) collectAliasIds(item, ids);
      return;
    }
    if (isObject(value)) {
      for (const item of Object.values(value)) collectAliasIds(item, ids);
    }
  }

  function isDynamic(id: string): boolean {
    if (dynamic.has(id)) return true;
    if (visiting.has(id)) return false;
    const token = defaultTokens.get(id);
    if (!token) return false;
    visiting.add(id);
    const refs = new Set<string>();
    if (token.aliasOf !== undefined) refs.add(token.aliasOf);
    else collectAliasIds(token.value, refs);
    let result = false;
    for (const refId of refs) {
      if (isDynamic(refId)) {
        result = true;
        break;
      }
    }
    visiting.delete(id);
    if (result) dynamic.add(id);
    return result;
  }

  for (const id of defaultTokens.keys()) isDynamic(id);

  return { ownerModifier, dynamic };
}

export interface ModifierContext {
  context: string;
  memberName: string;
  className: string;
}

export interface ModifierInfo {
  modifier: ResolverModifier;
  /** e.g. `theme` */
  fieldName: string;
  /** e.g. `TokensTheme` */
  enumName: string;
  /** e.g. `_TokensThemeVariant` */
  variantClassName: string;
  /** e.g. `_themeTokens` */
  accessorName: string;
  contexts: ModifierContext[];
  defaultMemberName: string;
  /** token ids directly declared inside this modifier's contexts, in first-seen order */
  ownedIds: string[];
}

export function buildModifierInfos(
  document: TokenDocument,
  classification: TokenClassification,
  className: string,
): ModifierInfo[] {
  return document.modifiers.map((modifier) => {
    const enumName = `${className}${pascalCase(modifier.name)}`;
    const contexts: ModifierContext[] = Object.keys(modifier.contexts).map((context) => ({
      context,
      memberName: camelCase(context),
      className: `_${enumName}${pascalCase(context)}`,
    }));
    const defaultMemberName = contexts.find((c) => c.context === modifier.default)!.memberName;
    const ownedIds: string[] = [];
    for (const [id, owner] of classification.ownerModifier) {
      if (owner === modifier.name) ownedIds.push(id);
    }
    return {
      modifier,
      fieldName: camelCase(modifier.name),
      enumName,
      variantClassName: `_${enumName}Variant`,
      accessorName: `_${camelCase(modifier.name)}Tokens`,
      contexts,
      defaultMemberName,
      ownedIds,
    };
  });
}

export function generateEnum(info: ModifierInfo): string {
  const members = info.contexts.map((c) => c.memberName).join(", ");
  const doc = info.modifier.description ? `/// ${info.modifier.description}\n` : "";
  return `${doc}enum ${info.enumName} { ${members} }`;
}

/** where a Dart expression referencing a token id is being generated */
export type RefScope = { kind: "tokens" } | { kind: "variant"; modifierName: string };

/**
 * builds the `ref` callback used to turn an alias target id into a Dart expression referencing the
 * (instance) field or getter that `Tokens` exposes for that id:
 * - constants (non-dynamic ids) and dynamic ids owned by a different modifier are reached through
 *   the `_tokens` delegate from a variant class, or are bare when generating `Tokens` itself
 *   (since `Tokens` has a member for every id).
 * - dynamic ids owned by the same modifier as the current variant are sibling getters (bare).
 */
export function createValueRef(
  classification: TokenClassification,
  nameFor: (id: string) => string,
  scope: RefScope,
): RefFn {
  return (aliasId: string): string => {
    const name = nameFor(aliasId);
    if (scope.kind === "tokens") return name;
    const owner = classification.ownerModifier.get(aliasId);
    if (owner === scope.modifierName) return name;
    return `_tokens.${name}`;
  };
}

/** fully inlines an alias chain into a literal Dart expression; used for the `Tokens` class'
 * constant field initializers, since Dart field initializers cannot reference sibling instance members */
export function createLiteralRef(document: TokenDocument, remPx: number): RefFn {
  const ref = (aliasId: string): string => {
    const resolved = document.resolveToken(aliasId, document.defaultInput)!;
    return toDart(resolved, { ref, remPx, literal: true });
  };
  return ref;
}

/** per-context Dart classes implementing the ids owned by one modifier; each variant holds its own
 * `Tokens` instance to act as a delegate for resolving non-sibling aliases */
export function generateContextClasses(
  document: TokenDocument,
  classification: TokenClassification,
  info: ModifierInfo,
  nameFor: (id: string) => string,
  className: string,
  remPx: number,
): string[] {
  const fields = info.ownedIds.map((id) => ({ id, name: nameFor(id) }));
  const ref = createValueRef(classification, nameFor, { kind: "variant", modifierName: info.modifier.name });
  const abstractBody = fields
    .map(({ id, name }) => `  /// token id: ${id}\n  ${dartTypeOf(document, id)} get ${name};`)
    .join("\n\n");
  const output = [`abstract interface class ${info.variantClassName} {\n${abstractBody}\n}`];

  for (const { context, className: contextClassName } of info.contexts) {
    const contextTokens = info.modifier.contexts[context]!;
    const body = fields
      .map(({ id, name }) => {
        const token = contextTokens.get(id) ?? document.defaultTokens.get(id)!;
        const expr = toDart(token, { ref, remPx });
        return `  @override\n  /// token id: ${id}\n  ${dartTypeOf(document, id)} get ${name} => ${expr};`;
      })
      .join("\n\n");
    output.push(
      `class ${contextClassName} implements ${info.variantClassName} {\n` +
        `  ${contextClassName}(this._tokens);\n\n` +
        `  final ${className} _tokens;\n\n${body}\n}`,
    );
  }
  return output;
}


function dartTypeOf(document: TokenDocument, id: string): string {
  const token = document.defaultTokens.get(id) as Token;
  return dartType(token.type);
}
