import type { TokenDocument } from "./load.ts";
import type { TypedValue, UntypedValue } from "./token-values.ts";
import type { ContrastAlgorithm } from "./validate.ts";

export interface TokenBase {
  /** dot separated path, e.g. `color.action.primary` (`$root` tokens get a `.$root` suffix) */
  id: string;
  /** set when the whole `$value` is an alias */
  aliasOf?: string | undefined;
  source?: DiagnosticSource | undefined;
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
  default: string;
  contexts: Record<string, TokenMap>;
}

export type ResolutionItem = ResolverSet | ResolverModifier;

export type ModifierInput = Record<string, string>;

export type Severity = "error" | "warning";

export interface Source {
  /** set or modifier/context name */
  context?: string | undefined;
  file?: string | undefined;
}

export interface DiagnosticSource extends Source {
  token?: string | undefined;
}

export interface TokenDiagnostic {
  severity: Severity;
  message: string;
  source?: DiagnosticSource[];
}

export type AnyDiagnosticSource = string | DiagnosticSource | Token;

export interface ContrastPair {
  foreground: string;
  background: string;
  minimum?: number;
}

export interface ContrastConfig {
  minimum?: number;
  algorithm?: ContrastAlgorithm | undefined;
  pairs: ContrastPair[];
}

export interface ValidationConfig {
  kebabCase?: boolean;
  contrast?: ContrastConfig;
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
  /** additional checks run by the `check` and `build` commands */
  validation?: ValidationConfig;
  plugins: Plugin[];
}
