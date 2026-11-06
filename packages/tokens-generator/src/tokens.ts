import type { Alias, TokenType } from "./token-values.ts";
import type { Token, TokenMap } from "./types.ts";

export type JsonObject = Record<string, unknown>;

const ALIAS_RE = /^\{([^{}]+)\}$/;

const TOKEN_TYPES: Record<TokenType, true> = {
  color: true,
  dimension: true,
  fontFamily: true,
  fontWeight: true,
  duration: true,
  cubicBezier: true,
  number: true,
  strokeStyle: true,
  border: true,
  transition: true,
  shadow: true,
  gradient: true,
  typography: true,
  string: true,
  boolean: true,
  link: true,
};

export function isTokenType(type: unknown): type is TokenType {
  return typeof type === "string" && Object.hasOwn(TOKEN_TYPES, type);
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAlias(value: unknown): value is Alias {
  return typeof value === "string" && ALIAS_RE.test(value);
}

/** returns the referenced token id when `value` is an alias like `{color.teal.500}` */
export function parseAlias(value: unknown): string | undefined {
  return typeof value === "string" ? ALIAS_RE.exec(value)?.[1] : undefined;
}

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

function getGroup(root: JsonObject, path: string[]): JsonObject {
  let node: unknown = root;
  for (const key of path) {
    node = isObject(node) ? node[key] : undefined;
  }
  if (!isObject(node)) throw new Error(`Unknown group "${path.join(".")}"`);
  return node;
}

function applyExtends(root: JsonObject, group: JsonObject, seen: Set<string>): JsonObject {
  const { $extends, ...rest } = group;
  const targetId = parseAlias($extends);
  if (!targetId) throw new Error(`Invalid $extends value ${JSON.stringify($extends)}`);
  if (seen.has(targetId)) throw new Error(`Circular $extends at "${targetId}"`);
  seen.add(targetId);
  let target = getGroup(root, targetId.split("."));
  if (target.$extends !== undefined) target = applyExtends(root, target, seen);
  return mergeTrees(target, rest);
}

function walk(
  root: JsonObject,
  node: JsonObject,
  path: string[],
  inheritedType: TokenType | undefined,
  tokens: TokenMap,
) {
  if (node.$extends !== undefined) node = applyExtends(root, node, new Set());
  let type = inheritedType;
  if (node.$type !== undefined) {
    if (!isTokenType(node.$type)) {
      throw new Error(`Unknown $type ${JSON.stringify(node.$type)} at "${path.join(".")}"`);
    }
    type = node.$type;
  }
  if ("$value" in node) {
    const id = path.join(".");
    // values are not validated (that is up to the linter)
    tokens.set(id, {
      id,
      path,
      type,
      value: node.$value,
      aliasOf: parseAlias(node.$value),
      description: node.$description as string | undefined,
      extensions: node.$extensions as Record<string, unknown> | undefined,
      deprecated: node.$deprecated as boolean | string | undefined,
    } as Token);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (!isObject(child)) continue;
    if (key === "$root") {
      walk(root, child, path, type, tokens);
    } else if (!key.startsWith("$")) {
      walk(root, child, [...path, key], type, tokens);
    }
  }
}

/** adds all tokens of a token document to `tokens` (existing ids are overridden) */
export function flattenTokens(root: JsonObject, tokens: TokenMap = new Map()): TokenMap {
  walk(root, root, [], undefined, tokens);
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
