import type { TypedValue, UntypedValue } from "./token-values.ts";

export interface TokenBase {
  /** dot separated path, e.g. `color.action.primary` (`$root` tokens use the group path) */
  id: string;
  path: string[];
  /** set when the whole `$value` is an alias */
  aliasOf?: string | undefined;
  description?: string | undefined;
  extensions?: Record<string, unknown> | undefined;
  deprecated?: boolean | string | undefined;
}

/** `type` is `$type` (inherited from groups or inferred from the alias target), `value` is the raw `$value` */
export type Token = TokenBase & (TypedValue | UntypedValue);

export type TokenMap = Map<string, Token>;

export interface ResolverSet {
  type: "set";
  name: string;
  description?: string | undefined;
  tokens: TokenMap;
}

export interface ResolverModifier {
  type: "modifier";
  name: string;
  description?: string | undefined;
  default?: string | undefined;
  contexts: Record<string, TokenMap>;
}

export type ResolutionItem = ResolverSet | ResolverModifier;

export type ModifierInput = Record<string, string>;

export interface TokenDocument {
  name?: string | undefined;
  version?: string | undefined;
  description?: string | undefined;
  resolutionOrder: ResolutionItem[];
  /** modifier name -> default context (first context when the modifier has no default) */
  defaultInput: ModifierInput;
  /** tokens resolved using the default modifier input */
  defaultTokens: TokenMap;
  /** merge all sets and the selected modifier contexts (missing inputs use the defaults) */
  resolve(input?: ModifierInput): TokenMap;
}

export interface BuildContext {
  document: TokenDocument;
  /** register a file (relative to `outDir`) to be written */
  outputFile(filename: string, contents: string): void;
}

export interface Plugin {
  name: string;
  build(ctx: BuildContext): void | Promise<void>;
}

export interface Config {
  /** path to the resolver document (relative to the config file) */
  resolver: string;
  /** output directory (relative to the config file), defaults to `dist` */
  outDir?: string;
  plugins: Plugin[];
}
