import * as fs from "node:fs/promises";
import * as path from "node:path";

import { flattenTokens, inferTypes, isObject, type JsonObject } from "./tokens.ts";
import type {
  ModifierInput,
  ResolutionItem,
  ResolverModifier,
  TokenDocument,
  TokenMap,
} from "./types.ts";

function parsePointer(pointer: string): string[] {
  const p = decodeURIComponent(pointer);
  if (p === "" || p === "/") return [];
  return p
    .replace(/^\//, "")
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
  async resolve(value: unknown, file: string, stack: string[] = []): Promise<unknown> {
    if (Array.isArray(value)) return Promise.all(value.map((v) => this.resolve(v, file, stack)));
    if (!isObject(value)) return value;
    if (typeof value.$ref === "string") {
      const { $ref, ...rest } = value;
      const target = await this.#target($ref, file);
      if (stack.includes(target.key)) throw new Error(`Circular $ref "${$ref}" in ${file}`);
      const resolved = await this.resolve(target.value, target.file, [...stack, target.key]);
      if (Object.keys(rest).length === 0) return resolved;
      return {
        ...(resolved as JsonObject),
        ...((await this.resolve(rest, file, stack)) as JsonObject),
      };
    }
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [k, await this.resolve(v, file, stack)] as const),
    );
    return Object.fromEntries(entries);
  }
}

function sourcesToTokens(sources: unknown, where: string): TokenMap {
  if (!Array.isArray(sources)) throw new Error(`Expected an array of sources in ${where}`);
  const tokens: TokenMap = new Map();
  for (const source of sources) {
    if (!isObject(source)) throw new Error(`Invalid source in ${where}`);
    flattenTokens(source, tokens);
  }
  return tokens;
}

async function loadItem(raw: unknown, file: string, refs: RefResolver): Promise<ResolutionItem> {
  if (!isObject(raw)) throw new Error(`Invalid resolutionOrder entry in ${file}`);
  let kind: unknown;
  let name: unknown;
  if (typeof raw.$ref === "string") {
    const [section, ...rest] = parsePointer(raw.$ref.split("#")[1] ?? "");
    kind = section === "sets" ? "set" : section === "modifiers" ? "modifier" : undefined;
    name = rest.at(-1);
  }
  const def = (await refs.resolve(raw, file)) as JsonObject;
  kind = def.type ?? kind;
  name = def.name ?? name;
  if (typeof name !== "string") throw new Error(`Missing name of resolutionOrder entry in ${file}`);
  const description = def.description as string | undefined;

  if (kind === "set") {
    return {
      type: "set",
      name,
      description,
      tokens: sourcesToTokens(def.sources, `set "${name}"`),
    };
  }
  if (kind === "modifier") {
    if (!isObject(def.contexts)) throw new Error(`Missing contexts in modifier "${name}"`);
    const contexts: Record<string, TokenMap> = {};
    for (const [ctx, sources] of Object.entries(def.contexts)) {
      contexts[ctx] = sourcesToTokens(sources, `modifier "${name}" context "${ctx}"`);
    }
    const defaultContext = def.default as string | undefined;
    if (defaultContext !== undefined && !(defaultContext in contexts)) {
      throw new Error(`Unknown default context "${defaultContext}" in modifier "${name}"`);
    }
    return { type: "modifier", name, description, default: defaultContext, contexts };
  }
  throw new Error(`Unknown type ${JSON.stringify(kind)} of resolutionOrder entry "${name}"`);
}

/** loads a DTCG 2025.10 resolver document and all referenced token files */
export async function loadDocument(resolverFile: string): Promise<TokenDocument> {
  const file = path.resolve(resolverFile);
  const refs = new RefResolver();
  const doc = await refs.readJson(file);
  if (!isObject(doc) || !Array.isArray(doc.resolutionOrder)) {
    throw new Error(`${file} is not a resolver document (missing resolutionOrder)`);
  }
  const resolutionOrder = await Promise.all(
    doc.resolutionOrder.map((item) => loadItem(item, file, refs)),
  );

  const modifiers = resolutionOrder.filter((i): i is ResolverModifier => i.type === "modifier");
  const defaultInput: ModifierInput = {};
  for (const m of modifiers) {
    const ctx = m.default ?? Object.keys(m.contexts)[0];
    if (ctx !== undefined) defaultInput[m.name] = ctx;
  }

  const resolve = (input: ModifierInput = {}): TokenMap => {
    const merged: TokenMap = new Map();
    for (const item of resolutionOrder) {
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
  };

  const defaultTokens = resolve(defaultInput);

  inferTypes(
    resolutionOrder.flatMap((i) => (i.type === "set" ? [i.tokens] : Object.values(i.contexts))),
    defaultTokens,
  );

  return {
    name: doc.name as string | undefined,
    version: doc.version as string | undefined,
    description: doc.description as string | undefined,
    resolutionOrder,
    defaultInput,
    defaultTokens,
    resolve,
  };
}
