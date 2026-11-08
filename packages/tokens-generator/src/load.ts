import * as fs from "node:fs/promises";
import * as path from "node:path";

import { isObject, parseAlias } from "./token-values.ts";
import { flattenTokens, inferTypes, resolveToken, type JsonObject } from "./tokens.ts";
import type {
  ModifierInput,
  ResolutionItem,
  ResolverModifier,
  TokenMap,
  Token,
  TokenDiagnostic,
  Severity,
  ResolverSet,
} from "./types.ts";

export const DTCG_VERSION_2025_10 = "2025.10";

function parsePointer(pointer: string): string[] {
  const p = decodeURIComponent(pointer);
  if (p === "" || p === "/") return [];
  return p
    .replace(/^\/+/, "")
    .split("/")
    .map((s) => s.replaceAll("~1", "/").replaceAll("~0", "~"));
}

class RefResolver {
  #files = new Map<string, Promise<unknown>>();

  static async #parseFile(file: string): Promise<unknown> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch (e) {
      throw new Error(`Failed to read ${file}: ${(e as Error).message}`, { cause: e });
    }
  }

  readJson(file: string): Promise<unknown> {
    let json = this.#files.get(file);
    if (json === undefined) {
      json = RefResolver.#parseFile(file);
      this.#files.set(file, json);
    }
    return json;
  }

  async #target(ref: string, file: string) {
    const hash = ref.indexOf("#");
    const filePart = hash < 0 ? ref : ref.slice(0, hash);
    const pointer = hash < 0 ? "" : ref.slice(hash + 1);
    const targetFile = filePart ? path.resolve(path.dirname(file), filePart) : file;
    let value = await this.readJson(targetFile);
    for (const key of parsePointer(pointer)) {
      value = isObject(value) || Array.isArray(value) ? (value as JsonObject)[key] : undefined;
      if (value === undefined) throw new Error(`Unresolvable $ref "${ref}" in ${file}`);
    }
    return { key: `${targetFile}#${pointer}`, file: targetFile, value };
  }

  /** returns a copy of `value` with all `$ref` objects replaced by their targets */
  async resolve(
    value: unknown,
    file: string,
    diagnostics: TokenDiagnostic[],
    stack: string[] = [],
  ): Promise<unknown> {
    if (Array.isArray(value))
      return Promise.all(value.map((v) => this.resolve(v, file, diagnostics, stack)));
    if (!isObject(value)) return value;
    if (typeof value.$ref === "string") {
      const { $ref, ...rest } = value;
      try {
        const target = await this.#target($ref, file);
        if (stack.includes(target.key)) throw new Error(`Circular $ref "${$ref}"`);
        const resolved = await this.resolve(target.value, target.file, diagnostics, [
          ...stack,
          target.key,
        ]);
        if (Object.keys(rest).length === 0) return resolved;
        const additions = await this.resolve(rest, file, diagnostics, stack);
        return {
          ...(isObject(resolved) ? resolved : {}),
          ...(isObject(additions) ? additions : {}),
        };
      } catch (error) {
        diagnostics.push({
          severity: "error",
          message: (error as Error).message,
          where: `${file}#${$ref}`,
        });
        return undefined;
      }
    }
    const entries = await Promise.all(
      Object.entries(value).map(
        async ([k, v]) => [k, await this.resolve(v, file, diagnostics, stack)] as const,
      ),
    );
    return Object.fromEntries(entries.filter(([, v]) => v !== undefined));
  }
}

function sourcesToTokens(
  sources: unknown,
  where: string,
  diagnostics: TokenDiagnostic[],
): TokenMap {
  const tokens: TokenMap = new Map();
  if (!Array.isArray(sources)) {
    diagnostics.push({ severity: "error", message: `Expected an array of sources in ${where}` });
    return tokens;
  }
  for (const [index, source] of sources.entries()) {
    if (!isObject(source)) {
      diagnostics.push({
        severity: "error",
        message: `Invalid source ${index} in ${where}`,
        where,
      });
      continue;
    }
    flattenTokens(source, diagnostics, where, tokens);
  }
  return tokens;
}

async function loadItem(
  raw: unknown,
  file: string,
  refs: RefResolver,
  diagnostics: TokenDiagnostic[],
): Promise<ResolutionItem> {
  if (!isObject(raw)) throw new Error(`Invalid resolutionOrder entry in ${file}`);
  let kind: unknown;
  let name: unknown;
  if (typeof raw.$ref === "string") {
    const [section, ...rest] = parsePointer(raw.$ref.split("#")[1] ?? "");
    kind = section === "sets" ? "set" : section === "modifiers" ? "modifier" : undefined;
    name = rest.at(-1);
  }
  const resolved = await refs.resolve(raw, file, diagnostics);
  if (!isObject(resolved)) throw new Error(`Invalid resolutionOrder entry in ${file}`);
  const def = resolved;
  kind = def.type ?? kind;
  name = def.name ?? name;
  if (typeof name !== "string") throw new Error(`Missing name of resolutionOrder entry in ${file}`);
  const description = def.description as string | undefined;

  if (kind === "set") {
    return {
      type: "set",
      name,
      description,
      tokens: sourcesToTokens(def.sources, `set "${name}"`, diagnostics),
    };
  }
  if (kind === "modifier") {
    if (!isObject(def.contexts)) throw new Error(`Missing contexts in modifier "${name}"`);
    const contexts: Record<string, TokenMap> = {};
    for (const [ctx, sources] of Object.entries(def.contexts)) {
      contexts[ctx] = sourcesToTokens(sources, `modifier "${name}" context "${ctx}"`, diagnostics);
    }
    if (Object.keys(contexts).length === 0) throw new Error(`Modifier "${name}" has no contexts`);
    const defaultContext = def.default as string | undefined;
    if (defaultContext !== undefined && !(defaultContext in contexts)) {
      throw new Error(`Unknown default context "${defaultContext}" in modifier "${name}"`);
    }
    return { type: "modifier", name, description, default: defaultContext, contexts };
  }
  throw new Error(`Unknown type ${JSON.stringify(kind)} of resolutionOrder entry "${name}"`);
}

export class TokenDocument {
  file?: string | undefined;
  diagnostics: TokenDiagnostic[] = [];
  name?: string | undefined;
  description?: string | undefined;
  resolutionOrder: ResolutionItem[] = [];
  /** modifier name -> default context (first context when the modifier has no default) */
  defaultInput: ModifierInput = {};
  /** tokens resolved using the default modifier input */
  defaultTokens: TokenMap = new Map();
  constructor(file: string | undefined) {
    this.file = file;
  }
  diagnostic(severity: Severity, message: string, where?: string) {
    this.diagnostics.push({ severity, message, where });
  }
  error(message: string, where?: string) {
    this.diagnostic("error", message, where);
  }
  warning(message: string, where?: string) {
    this.diagnostic("warning", message, where);
  }

  /** loads a DTCG 2025.10 resolver document and all referenced token files */
  static async load(resolverFile: string): Promise<TokenDocument> {
    const file = path.resolve(resolverFile);
    const doc = new TokenDocument(file);
    const refs = new RefResolver();
    const resolverDoc = await refs.readJson(file);
    if (!isObject(resolverDoc)) {
      doc.error(`Document is not a resolver document (invalid format)`, file);
      return doc;
    }
    if (resolverDoc.version !== DTCG_VERSION_2025_10) {
      doc.error(
        `Document is not a resolver document (unsupported version ${JSON.stringify(resolverDoc.version)})`,
        file,
      );
      return doc;
    }
    if (!Array.isArray(resolverDoc.resolutionOrder)) {
      doc.error(`Document is not a resolver document (missing resolutionOrder)`, file);
      return doc;
    }
    if (typeof resolverDoc.name === "string") {
      doc.name = resolverDoc.name;
    } else if (resolverDoc.name !== undefined) {
      doc.warning(`Document has an invalid name. must be a string`, file);
    }
    if (typeof resolverDoc.description === "string") {
      doc.description = resolverDoc.description;
    } else if (resolverDoc.description !== undefined) {
      doc.warning(`Document has an invalid description. must be a string`, file);
    }
    const loadedItems = await Promise.all(
      resolverDoc.resolutionOrder.map(async (item) => {
        try {
          return await loadItem(item, file, refs, doc.diagnostics);
        } catch (error) {
          doc.error((error as Error).message, file);
          return undefined;
        }
      }),
    );
    doc.resolutionOrder = loadedItems.filter((item): item is ResolutionItem => item !== undefined);

    for (const m of doc.modifiers) {
      let ctx = Object.keys(m.contexts)[0];
      if (m.default !== undefined) {
        if (typeof m.default === "string") {
          ctx = m.default;
        } else {
          doc.warning(`Default value for modifier "${m.name}" must be a string`, file);
        }
      }
      if (ctx !== undefined) doc.defaultInput[m.name] = ctx;
    }

    doc.defaultTokens = doc.resolve(doc.defaultInput);

    inferTypes(
      doc.resolutionOrder.flatMap((i) =>
        i.type === "set" ? [i.tokens] : Object.values(i.contexts),
      ),
      doc.defaultTokens,
    );

    doc.validateReferences();

    return doc;
  }

  resolve(input: ModifierInput = {}): TokenMap {
    const merged: TokenMap = new Map();
    for (const item of this.resolutionOrder) {
      let tokens: TokenMap | undefined;
      if (item.type === "set") {
        tokens = item.tokens;
      } else {
        const ctx = input[item.name] ?? item.default;
        if (ctx === undefined) throw new Error(`Missing input for modifier "${item.name}"`);
        tokens = item.contexts[ctx];
        if (!tokens) throw new Error(`Unknown context "${ctx}" for modifier "${item.name}"`);
      }
      for (const [id, token] of tokens) merged.set(id, token);
    }
    return merged;
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
                this.diagnostics.push({
                  severity: "warning",
                  message: `Token type ${token.type} differs from aliased token type ${target.type}`,
                  token: token.id,
                  where: token.source,
                });
              }
            }
          } catch (error) {
            const key = `reference:${token.id}:${alias.id}`;
            if (!diagnosed.has(key)) {
              diagnosed.add(key);
              this.diagnostics.push({
                severity: "error",
                message: (error as Error).message,
                token: token.id,
                where: token.source,
              });
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
}
