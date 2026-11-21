import type { TokenDocument } from "@hommel/tokens-generator";
import type { Config as TokensConfig } from "@hommel/tokens-generator";
export type { Config as TokensConfig } from "@hommel/tokens-generator";
export interface TokensAddonState {
  tokenDocument: TokenDocument;
}

export interface TokensGlobals {
  [modifier: string]: string,
}

export interface TokensTypes {
  globals: TokensGlobals;
}

export interface TokensOptions {
  config?: string | TokensConfig;
}
