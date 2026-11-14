/** Node-only: loads a DTCG resolver document (with `$ref` resolution) from the file system */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { parsePointer, TokenDocument } from "./document.ts";
import { isObject } from "./token-values.ts";
import type { JsonObject } from "./tokens.ts";
import type { TokenDiagnostic } from "./types.ts";

export class RefResolver {
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
          source: [{ file }],
        });
        return rest;
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

/** loads a DTCG 2025.10 resolver document and all referenced token files */
export async function loadTokenDocument(resolverFile: string): Promise<TokenDocument> {
  const file = path.resolve(resolverFile);
  const refs = new RefResolver();
  const resolverDoc = await refs.readJson(file);
  const doc = TokenDocument.fromResolverDocument(resolverDoc, file, refs);
  return doc;
}

export { TokenDocument } from "./document.ts";
