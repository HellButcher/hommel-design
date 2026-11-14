/** browser-safe core: resolution, validation and (de)serialization of an already-loaded token document */

import type { RefResolver } from "./load.ts";
import { isObject, parseAlias } from "./token-values.ts";
import { flattenTokens, inferTypes, resolveToken, type JsonObject } from "./tokens.ts";
import type {
  AnyDiagnosticSource,
  DiagnosticSource,
  ModifierInput,
  ResolutionItem,
  ResolverModifier,
  ResolverSet,
  Severity,
  Source,
  Token,
  TokenDiagnostic,
  TokenMap,
  TokenResolverDocument,
} from "./types.ts";

export const DTCG_VERSION_2025_10 = "2025.10";
export const DTCG_RESOLVER_SCHEMA = "https://www.designtokens.org/schemas/2025.10/resolver.json";

function normalizeDiagnosticSource(
  source?: AnyDiagnosticSource | AnyDiagnosticSource[],
): DiagnosticSource[] {
  if (!source) return [];
  function normalizeItem(item: AnyDiagnosticSource): DiagnosticSource {
    if (typeof item === "string") return { file: item };
    if ("id" in item) return { ...item.source, token: item.id };
    return item;
  }
  if (typeof source === "string") {
    return [{ file: source }];
  } else if (Array.isArray(source)) {
    return source.map(normalizeItem);
  } else if (source !== undefined) {
    return [normalizeItem(source)];
  } else {
    return [];
  }
}

export function parsePointer(pointer: string): string[] {
  const p = decodeURIComponent(pointer);
  if (p === "" || p === "/") return [];
  return p
    .replace(/^\/+/, "")
    .split("/")
    .map((s) => s.replaceAll("~1", "/").replaceAll("~0", "~"));
}

export function isTokenResolverDocument(doc: unknown): doc is TokenResolverDocument {
  return (
    isObject(doc) &&
    doc.version === DTCG_VERSION_2025_10 &&
    Array.isArray(doc.resolutionOrder) &&
    (typeof doc.name === "string" || doc.name === undefined) &&
    (typeof doc.description === "string" || doc.description === undefined)
  );
}

export class TokenDocument {
  file?: string | undefined;
  diagnostics: TokenDiagnostic[] = [];
  name?: string | undefined;
  description?: string | undefined;
  resolutionOrder: ResolutionItem[] = [];
  /** modifier name -> default context (first context when the modifier has no default) */
  defaultInput: ModifierInput = {};
  /** all possible modifier permutations */
  allModifierPermutations: ModifierInput[] = [{}];
  /** tokens resolved using the default modifier input */
  defaultTokens: TokenMap = new Map();
  constructor(file?: string | undefined) {
    this.file = file;
  }
  diagnostic(
    severity: Severity,
    message: string,
    source?: AnyDiagnosticSource | AnyDiagnosticSource[],
  ) {
    this.diagnostics.push({ severity, message, source: normalizeDiagnosticSource(source) });
  }
  error(message: string, source?: AnyDiagnosticSource | AnyDiagnosticSource[]) {
    this.diagnostic("error", message, source);
  }
  warning(message: string, source?: AnyDiagnosticSource | AnyDiagnosticSource[]) {
    this.diagnostic("warning", message, source);
  }

  private sourcesToTokens(sources: unknown, where: Source): TokenMap {
    const tokens: TokenMap = new Map();
    if (!Array.isArray(sources)) {
      this.error(`Expected an array of sources`, where);
      return tokens;
    }
    for (const [index, source] of sources.entries()) {
      if (!isObject(source)) {
        this.error(`Invalid source ${index}`, where);
        continue;
      }
      flattenTokens(source, this.diagnostics, where, tokens);
    }
    return tokens;
  }

  private async resolveAndLoadItem(
    raw: unknown,
    file: string,
    refs: RefResolver,
  ): Promise<ResolutionItem | undefined> {
    if (!isObject(raw)) {
      this.error(`Invalid resolutionOrder entry`, { file });
      return undefined;
    }
    if (typeof raw.$ref === "string") {
      if (!refs) throw new Error(`RefResolver is required to resolve $ref "${raw.$ref}"`);
      const [section, ...rest] = parsePointer(raw.$ref.split("#")[1] ?? "");
      if (!raw.type)
        raw.type = section === "sets" ? "set" : section === "modifiers" ? "modifier" : undefined;
      if (!raw.name) raw.name = rest.at(-1);
    }
    const resolved = refs ? await refs.resolve(raw, file, this.diagnostics) : raw;
    return this.loadItem(resolved, file);
  }

  private loadItem(resolvedRaw: unknown, file?: string) {
    if (!isObject(resolvedRaw)) {
      this.error(`Invalid resolutionOrder entry`, { file });
      return undefined;
    }
    const def = resolvedRaw;
    if (def.$ref) {
      this.error(`Unexpected $ref in resolutionOrder entry`, { file });
      return undefined;
    }
    if (!def.type) {
      this.error(`Missing type of resolutionOrder entry`, { file });
      return undefined;
    }
    if (typeof def.name !== "string") {
      this.error(`Missing name of resolutionOrder entry or not string `, { file });
      return undefined;
    }
    const name = def.name;
    const description = def.description as string | undefined;

    switch (def.type) {
      case "set": {
        const item: ResolutionItem = {
          type: "set",
          name,
          description,
          tokens: this.sourcesToTokens(def.sources, { context: `set:${name}`, file }),
          raw: def,
        };
        this.resolutionOrder.push(item);
        return item;
      }
      case "modifier": {
        if (!isObject(def.contexts)) {
          this.error(`Missing contexts in modifier "${name}"`, { file });
          return undefined;
        }
        const contexts: Record<string, TokenMap> = {};
        for (const [ctx, sources] of Object.entries(def.contexts)) {
          contexts[ctx] = this.sourcesToTokens(sources, {
            context: `modifier:${name}/${ctx}`,
            file,
          });
        }
        const contextKeys = Object.keys(contexts);
        if (contextKeys.length === 0) {
          this.error(`Modifier "${name}" has no contexts`, { file });
          return undefined;
        }
        let defaultContext = def.default as string | undefined;
        if (defaultContext !== undefined && !(defaultContext in contexts)) {
          this.error(
            `Unknown default context "${JSON.stringify(defaultContext)}" in modifier "${name}"`,
            { file },
          );
          defaultContext = undefined;
        }
        const item: ResolutionItem = {
          type: "modifier",
          name,
          description,
          default: defaultContext ?? contextKeys[0]!,
          contexts,
          raw: def,
        };
        this.resolutionOrder.push(item);
        return item;
      }
      default:
        this.error(`Unknown type ${JSON.stringify(def.type)} of resolutionOrder entry "${name}"`, {
          file,
        });
        return undefined;
    }
  }

  private getTokenMapsForInput(input: ModifierInput): TokenMap[] {
    const maps: TokenMap[] = [];
    for (const item of this.resolutionOrder) {
      if (item.type === "set") {
        maps.push(item.tokens);
      } else {
        const ctx = input[item.name] ?? item.default;
        if (ctx === undefined) throw new Error(`Missing input for modifier "${item.name}"`);
        const tokens = item.contexts[ctx];
        if (!tokens) throw new Error(`Unknown context "${ctx}" for modifier "${item.name}"`);
        maps.push(tokens);
      }
    }
    return maps;
  }

  resolve(input: ModifierInput = {}): TokenMap {
    const merged: TokenMap = new Map();
    for (const tokens of this.getTokenMapsForInput(input)) {
      for (const [id, token] of tokens) merged.set(id, token);
    }
    return merged;
  }

  resolveToken(id: string, input: ModifierInput = {}): Token | undefined {
    return resolveToken(id, this.getTokenMapsForInput(input));
  }

  get modifiers() {
    return this.resolutionOrder.filter(
      (item): item is ResolverModifier => item.type === "modifier",
    );
  }

  get sets() {
    return this.resolutionOrder.filter((item): item is ResolverSet => item.type === "set");
  }

  validateReferences() {
    const diagnosed = new Set<string>();
    const removeToken = (token: Token) => {
      for (const item of this.resolutionOrder) {
        const maps = item.type === "set" ? [item.tokens] : Object.values(item.contexts);
        for (const map of maps) {
          if (map.get(token.id) === token) map.delete(token.id);
        }
      }
    };
    const visitContexts = (index: number, input: ModifierInput) => {
      const modifiers = this.modifiers;
      if (index < modifiers.length) {
        const modifier = modifiers[index]!;
        for (const context of Object.keys(modifier.contexts)) {
          visitContexts(index + 1, { ...input, [modifier.name]: context });
        }
        return;
      }
      const tokens = this.resolve(input);
      for (const token of tokens.values()) {
        const aliases: { id: string; wholeToken: boolean }[] = [];
        const visitValue = (value: unknown, wholeToken = false) => {
          const alias = parseAlias(value);
          if (alias !== undefined) {
            aliases.push({ id: alias, wholeToken });
          } else if (Array.isArray(value)) {
            value.forEach((item) => visitValue(item));
          } else if (isObject(value)) {
            Object.values(value).forEach((item) => visitValue(item));
          }
        };
        visitValue(token.value, true);
        for (const alias of aliases) {
          try {
            const target = resolveToken(alias.id, tokens);
            if (alias.wholeToken && token.type && target.type && token.type !== target.type) {
              const key = `type:${token.id}:${alias.id}`;
              if (!diagnosed.has(key)) {
                diagnosed.add(key);
                this.warning(
                  `Token type ${token.type} differs from aliased token type ${target.type}`,
                  token,
                );
              }
            }
          } catch (error) {
            const key = `reference:${token.id}:${alias.id}`;
            if (!diagnosed.has(key)) {
              diagnosed.add(key);
              this.error(
                `Failed to resolve alias ${alias.id} for token ${token.id}: ${(error as Error).message}`,
                token,
              );
            }
            removeToken(token);
          }
        }
      }
    };
    let previousSize = -1;
    while (
      previousSize !==
      this.resolutionOrder.reduce((size, item) => {
        const maps = item.type === "set" ? [item.tokens] : Object.values(item.contexts);
        return size + maps.reduce((mapSize, map) => mapSize + map.size, 0);
      }, 0)
    ) {
      previousSize = this.resolutionOrder.reduce((size, item) => {
        const maps = item.type === "set" ? [item.tokens] : Object.values(item.contexts);
        return size + maps.reduce((mapSize, map) => mapSize + map.size, 0);
      }, 0);
      visitContexts(0, {});
    }
    this.defaultTokens = this.resolve(this.defaultInput);
  }

  /** derives `defaultInput`/`allModifierPermutations`/`defaultTokens`, infers untyped alias types, and validates references */
  finalize() {
    for (const m of this.modifiers) {
      this.defaultInput[m.name] = m.default;
      const newPermutations: ModifierInput[] = [];
      for (const context of Object.keys(m.contexts)) {
        for (const permutation of this.allModifierPermutations) {
          newPermutations.push({ ...permutation, [m.name]: context });
        }
      }
      this.allModifierPermutations = newPermutations;
    }

    this.defaultTokens = this.resolve(this.defaultInput);

    inferTypes(
      this.resolutionOrder.flatMap((i) =>
        i.type === "set" ? [i.tokens] : Object.values(i.contexts),
      ),
      this.defaultTokens,
    );

    this.validateReferences();
  }

  static async fromResolverDocument(file: string, refs: RefResolver): Promise<TokenDocument>;
  static async fromResolverDocument(
    resolverDoc: unknown,
    file: string,
    refs: RefResolver,
  ): Promise<TokenDocument>;
  static async fromResolverDocument(
    fileOrDoc: unknown,
    refsOrFile: string | RefResolver,
    refsOpt?: RefResolver,
  ): Promise<TokenDocument> {
    const file = typeof refsOrFile === "string" ? refsOrFile : (fileOrDoc as string);
    const refs = refsOpt ?? (refsOrFile as RefResolver);
    const resolverDoc = typeof refsOrFile === "string" ? fileOrDoc : await refs.readJson(file);

    const doc = new TokenDocument(file);
    if (!isTokenResolverDocument(resolverDoc)) {
      doc.error(`Document is not a resolver document`, file);
      return doc;
    }

    for (const item of resolverDoc.resolutionOrder) {
      await doc.resolveAndLoadItem(item, file, refs);
    }

    doc.finalize();

    return doc;
  }

  static fromJSON(resolverDoc: unknown, file?: string): TokenDocument {
    const doc = new TokenDocument(file);
    if (!isTokenResolverDocument(resolverDoc)) {
      doc.error(`Document is not a resolver document`, file);
      return doc;
    }

    for (const item of resolverDoc.resolutionOrder) {
      doc.loadItem(item, file);
    }

    doc.finalize();

    return doc;
  }

  toJSON(): TokenResolverDocument {
    return {
      $schema: DTCG_RESOLVER_SCHEMA,
      name: this.name,
      description: this.description,
      version: DTCG_VERSION_2025_10,
      sets: {},
      modifiers: {},
      resolutionOrder: this.resolutionOrder.map((item) => item.raw),
    };
  }
}
