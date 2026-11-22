import {
  resolveToken,
  type ModifierInput,
  type Token,
  type TokenDocument,
  type TokenMap,
  type TokenType,
} from "@hommel/tokens-generator";
import { defaultVarNameFunction, toCss, type VarNameMapper } from "@hommel/tokens-generator-css";
import React from "react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface TokensContextValue {
  document: TokenDocument;
  input: ModifierInput;
  setInput(input: ModifierInput): void;
  tokens: TokenMap;
  varName: VarNameMapper;
}

const TokensContext = createContext<TokensContextValue | undefined>(undefined);
TokensContext.displayName = "TokensContext";

export interface TokensProviderProps {
  document: TokenDocument;
  children?: ReactNode;
  /** controlled modifier input; omit for uncontrolled (defaults to `document.defaultInput`) */
  input?: ModifierInput;
  onInputChange?(input: ModifierInput): void;
  /** maps a token id to its CSS custom property name; defaults to the same convention used by `@hommel/tokens-generator-css` (prefix `h`) */
  varName?: VarNameMapper;
}

/** provides a resolved `TokenDocument` (and the current modifier input) to the components below it */
export function TokensProvider({
  document,
  children,
  input,
  onInputChange,
  varName,
}: TokensProviderProps) {
  const [uncontrolledInput, setUncontrolledInput] = useState<ModifierInput>(document.defaultInput);
  const currentInput = input ?? uncontrolledInput;
  const setInput = onInputChange ?? setUncontrolledInput;
  const tokens = useMemo(() => document.resolve(currentInput), [document, currentInput]);
  const resolvedVarName = useMemo(() => varName ?? defaultVarNameFunction("h"), [varName]);
  const value = useMemo<TokensContextValue>(
    () => ({ document, input: currentInput, setInput, tokens, varName: resolvedVarName }),
    [document, currentInput, setInput, tokens, resolvedVarName],
  );
  return <TokensContext.Provider value={value}>{children}</TokensContext.Provider>;
}

function useTokensContext(): TokensContextValue {
  const ctx = useContext(TokensContext);
  if (!ctx) throw new Error("This component must be used within a <TokensProvider>");
  return ctx;
}

export function useTokenDocument(): TokenDocument {
  return useTokensContext().document;
}

export function useTokenMap(): TokenMap {
  return useTokensContext().tokens;
}

/** maps a token id to its CSS custom property name, e.g. `color.teal.500` -> `--h-color-teal-500` */
export function useVarName(): VarNameMapper {
  return useTokensContext().varName;
}

export function useToken(idOrToken: string | Token): Token {
  if (typeof idOrToken === "string") {
    const tokens = useTokenMap();
    const token = tokens.get(idOrToken);
    if (!token) throw new Error(`Invalid token id ${idOrToken}`);
    return token;
  } else {
    return idOrToken;
  }
}

export function useResolvedToken(idOrToken: string | Token): Token {
  const tokens = useTokenMap();
  return resolveToken(idOrToken, tokens);
}

export function useModifiers() {
  return useTokensContext().document.modifiers;
}

export function useModifierInput(): [ModifierInput, (input: ModifierInput) => void] {
  const { input, setInput } = useTokensContext();
  return [input, setInput];
}

export function useSetModifier(): (name: string, context: string) => void {
  const { input, setInput } = useTokensContext();
  return (name, context) => setInput({ ...input, [name]: context });
}

/** inlined CSS value of a token (all alias references resolved to literal values) */
export function useTokenCss(idOrToken: string | Token, expectedType?: TokenType): string {
  const token = useResolvedToken(idOrToken);
  if (expectedType && token.type !== expectedType) {
    throw new Error(`Token ${token.id} is not a ${expectedType}, it is ${token.type}`);
  }
  return toCss(token, useTokenCss);
}

/** a token, identified either by a resolved `Token` object or by its `id` (resolved via `TokensProvider`) */
export type TokenRefProps =
  | { token: Token | string; key?: string | undefined }
  | { token?: undefined; key: string };

export function useTokenRef(ref: TokenRefProps): Token {
  return useToken(ref.token ?? ref.key);
}
