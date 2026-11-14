/** browser-safe entry point: no `node:fs` anywhere in this module's dependency graph */

export type * from "./types.ts";
export * from "./token-values.ts";
export { TokenDocument } from "./document.ts";
export { resolveToken } from "./tokens.ts";
export { checkDocument, type ContrastAlgorithm } from "./validate.ts";
