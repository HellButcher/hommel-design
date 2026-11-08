import {
  isAliasValue,
  isObject,
  isTokenType,
  isTokenValue,
  parseAlias,
  type TokenType,
} from "./token-values.ts";
import type { DiagnosticSource, Severity, Token, TokenDiagnostic, TokenMap } from "./types.ts";

export type JsonObject = Record<string, unknown>;

const META_KEYS = new Set([
  "$schema",
  "$type",
  "$value",
  "$description",
  "$deprecated",
  "$extends",
  "$extensions",
]);

/** follows the alias chain of `id` and returns the final (non-alias) token */
export function resolveToken(id: string, tokens: TokenMap | TokenMap[]): Token {
  const maps = Array.isArray(tokens) ? tokens : [tokens];
  const seen = new Set<string>();
  let current = id;
  for (;;) {
    const token = maps.find((map) => map.has(current))?.get(current);
    if (!token) {
      throw new Error(
        `Unknown token "${current}"${current !== id ? ` (referenced by "${id}")` : ""}`,
      );
    }
    if (!token.aliasOf) return token;
    if (seen.has(current)) throw new Error(`Circular alias at "${current}"`);
    seen.add(current);
    current = token.aliasOf;
  }
}

/** deep merge of token trees; tokens (objects with `$value`) are replaced, groups are merged */
export function mergeTrees(base: JsonObject, override: JsonObject): JsonObject {
  if ("$value" in base || "$value" in override) return override;
  const result: JsonObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const prev = result[key];
    result[key] = isObject(prev) && isObject(value) ? mergeTrees(prev, value) : value;
  }
  return result;
}

class Walk {
  diagnostics: TokenDiagnostic[];
  where?: DiagnosticSource;
  path: string[];
  root: JsonObject;
  constructor({
    root,
    where,
    diagnostics = [],
  }: {
    root: JsonObject;
    where?: DiagnosticSource | undefined;
    diagnostics?: TokenDiagnostic[] | undefined;
  }) {
    this.root = root;
    this.diagnostics = diagnostics;
    this.where = where || {};
    this.path = [];
  }

  diagnostic(severity: Severity, message: string) {
    this.diagnostics.push({
      severity,
      message,
      source: [{ ...this.where, token: this.path.join(".") || "<root>" }],
    });
  }
  error(message: string) {
    this.diagnostic("error", message);
  }
  warning(message: string) {
    this.diagnostic("warning", message);
  }

  walk(
    token_callback: (token: Token) => void,
    node: JsonObject = this.root,
    inheritedType: TokenType | undefined = undefined,
  ) {
    if (node.$extends !== undefined) {
      node = this.applyExtends(node);
    }
    let type = inheritedType;
    if (node.$type !== undefined) {
      if (!isTokenType(node.$type)) {
        this.warning(
          `Unknown $type ${JSON.stringify(node.$type)}; attempting to emit as an untyped value`,
        );
        type = undefined;
      } else {
        type = node.$type;
      }
    }
    let description;
    if (node.$description !== undefined && typeof node.$description !== "string") {
      this.warning("$description must be a string");
      description = undefined;
    } else {
      description = node.$description;
    }
    let deprecated;
    if (
      node.$deprecated !== undefined &&
      typeof node.$deprecated !== "boolean" &&
      typeof node.$deprecated !== "string"
    ) {
      this.warning("$deprecated must be a boolean or string");
      deprecated = true;
    } else {
      deprecated = node.$deprecated;
    }
    let extensions;
    if (node.$extensions !== undefined && !isObject(node.$extensions)) {
      this.warning("$extensions must be an object");
      extensions = undefined;
    } else {
      extensions = node.$extensions;
    }
    if ("$value" in node) {
      const id = this.path.join(".");
      let value;
      if (isTokenValue(type, node.$value)) {
        value = node.$value;
      } else {
        this.error(`Cannot emit value as ${type ?? "an untyped token"}`);
        return;
      }
      if (type === undefined && !isAliasValue(value)) {
        this.warning("Token has no usable $type; emitting its string or number value as untyped");
      }
      token_callback({
        id,
        type,
        value,
        aliasOf: parseAlias(node.$value),
        source: this.where,
        description,
        extensions,
        deprecated,
      } as Token);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === "$root") {
        if (!isObject(child)) {
          this.error("$root must be an object");
        } else {
          this.walk(token_callback, child, type);
        }
      } else if (key.startsWith("$")) {
        if (!META_KEYS.has(key)) {
          this.warning(`Unknown token property ${key}`);
        }
      } else if (!isObject(child)) {
        this.error("Token groups and definitions must be objects");
      } else {
        this.path.push(key);
        this.walk(token_callback, child, type);
        this.path.pop();
      }
    }
  }

  getGroup(path: string[]): JsonObject | undefined {
    let node: unknown = this.root;
    for (const key of path) {
      node = isObject(node) ? node[key] : undefined;
    }
    if (!isObject(node)) return undefined;
    return node;
  }

  applyExtends(group: JsonObject, seen: Set<string> = new Set()): JsonObject {
    const { $extends, ...rest } = group;
    const targetId = parseAlias($extends);
    if (!targetId) {
      this.error(`Invalid $extends value ${JSON.stringify($extends)}`);
      return rest;
    }
    if (seen.has(targetId)) {
      this.error(`Circular $extends at "${targetId}"`);
      return rest;
    }
    seen.add(targetId);
    const targetPath = targetId.split(".");
    let target = this.getGroup(targetPath);
    if (!target) {
      this.error(`Unknown group "${targetId}"`);
      return rest;
    }
    if (target.$extends !== undefined) {
      target = this.applyExtends(target, seen);
    }
    return mergeTrees(target, rest);
  }
}

/** adds all tokens of a token document to `tokens` (existing ids are overridden) */
export function flattenTokens(
  root: JsonObject,
  diagnostics: TokenDiagnostic[],
  where?: DiagnosticSource | undefined,
  tokens: TokenMap = new Map(),
): TokenMap {
  const ctx = new Walk({ root, where, diagnostics });
  ctx.walk((t) => {
    if (tokens.has(t.id)) {
      ctx.warning(`Duplicate token id "${t.id}"`);
    }
    tokens.set(t.id, t);
  });
  return tokens;
}

function findType(token: Token, maps: TokenMap[], seen: Set<string>): TokenType | undefined {
  if (token.type || !token.aliasOf || seen.has(token.id)) return token.type;
  seen.add(token.id);
  for (const map of maps) {
    const target = map.get(token.aliasOf);
    if (target) return findType(target, maps, seen);
  }
  return undefined;
}

/** tokens without `$type` take the type of their alias target (looked up in `lookup` first) */
export function inferTypes(maps: TokenMap[], lookup: TokenMap) {
  for (const map of maps) {
    for (const token of map.values()) {
      token.type ??= findType(token, [lookup, map], new Set());
    }
  }
}
