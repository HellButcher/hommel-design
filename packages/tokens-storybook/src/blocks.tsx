import {
  TokensProvider as BaseTokensProvider,
  type TokensProviderProps,
} from "@hommel/tokens-tokenbook";
import * as React from "react";

import { tokensDocument } from "./host-document.ts";

import "@hommel/tokens-tokenbook/style.css";

export * from "@hommel/tokens-tokenbook";
export { tokensDocument } from "./host-document.ts";
export { TokensDocsContainer } from "./docs-container.tsx";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export function TokensProvider(props: PartialBy<TokensProviderProps, "document">) {
  const document = props.document ?? tokensDocument;
  return <BaseTokensProvider {...props} document={document} />;
}
