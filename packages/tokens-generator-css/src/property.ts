import type { Token, TokenType, TypographyValue } from "@hommel/tokens-generator";

import { toCss, typographyProperties, type VarName } from "./values.ts";

export type BaseSyntaxType =
  | "*"
  | "<color>"
  | "<length>"
  | "<time>"
  | "<integer>"
  | "<number>"
  | "<url>";
export type SyntaxType = BaseSyntaxType | Record<keyof TypographyValue, BaseSyntaxType>;

const TOKEN_TYPE_SYNTAX: Readonly<Partial<Record<TokenType, SyntaxType>>> = {
  color: "<color>",
  dimension: "<length>",
  duration: "<time>",
  fontWeight: "<number>",
  number: "<number>",
  boolean: "<integer>",
  link: "<url>",
  typography: {
    fontFamily: "*",
    fontSize: "<length>",
    fontWeight: "<number>",
    letterSpacing: "<length>",
    lineHeight: "<number>",
  },
};

export function propertySyntax(token: Token): SyntaxType | undefined {
  if (!token.type || token.aliasOf) return undefined;
  const coreSyntax = TOKEN_TYPE_SYNTAX[token.type];
  if (coreSyntax) return coreSyntax;
  return typeof token.value === "string" ? "*" : undefined;
}

// font-, viewport- and container-relative units
const RELATIVE_UNIT_RE =
  /\d(?:r?(?:em|ex|cap|ch|ic|lh)|[sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))\b/i;
const DYNAMIC_VALUE_RE = /\b(?:var|env|attr)\(|\bcurrentcolor\b/i;

/** `@property` initial values must not depend on other values (relative units, `var()`, ...) */
export function isComputationallyIndependent(value: string): boolean {
  return !RELATIVE_UNIT_RE.test(value) && !DYNAMIC_VALUE_RE.test(value);
}

/** a rule is only emitted when the initial value is valid; otherwise the browser would drop it anyway */
function propertyRule(name: string, syntax: string, initialValue: string): string[] {
  if (!isComputationallyIndependent(initialValue)) return [];
  return [
    `@property ${name} {\n  syntax: '${syntax}';\n  inherits: true;\n  initial-value: ${initialValue};\n}`,
  ];
}

/** `@property` rules registering the custom properties of a (non-alias) token */
export function propertyRules(token: Token, varName: VarName): string[] {
  const syntax = propertySyntax(token);
  if (!syntax || syntax === "*") return [];
  if (typeof syntax === "string")
    return propertyRule(varName(token.id), syntax, toCss(token, varName));
  if (token.type === "typography" && typeof token.value !== "string") {
    const props = typographyProperties(token.value, varName);
    return Object.entries(syntax)
      .filter(([, subtype]) => subtype && subtype !== "*")
      .flatMap(([key, subSyntax]) =>
        propertyRule(varName(`${token.id}.${key}`), subSyntax, props[key as keyof TypographyValue]),
      );
  }
  return [];
}
