import { BuildHookOptions, TokenTransformed } from "@terrazzo/parser";
import { generateShorthand } from "@terrazzo/token-tools/css";

import { CSS_FORMAT_ID } from "./constants";
import { walkGroups } from "./utils";

const TOKEN_TYPE_SYNTAX: Record<string, string> = {
  color: "<color>",
  dimension: "<length>",
  duration: "<time>",
  fontWeight: "<integer>",
  number: "<number>",
  boolean: "<integer>",
  fontFamily: "*",
  string: "*",
  cubicBezier: "*",
  border: "*",
  shadow: "*",
  gradient: "*",
  typography: "*",
  transition: "*",
  strokeStyle: "*",
  link: "<url>",
};

const SUB_PROPERTY_SYNTAX: Record<string, Record<string, string>> = {
  border: { color: "<color>", width: "<length>", style: "*" },
  shadow: {
    color: "<color>",
    "offset-x": "<length>",
    "offset-y": "<length>",
    blur: "<length>",
    spread: "<length>",
  },
  transition: { duration: "<time>", delay: "<time>", "timing-function": "*" },
  typography: {
    "font-family": "*",
    "font-size": "<length>",
    "font-weight": "<integer>",
    "line-height": "*",
    "letter-spacing": "<length>",
    "font-style": "*",
    "font-variant": "*",
    "font-variation-settings": "*",
    "text-decoration": "*",
    "text-transform": "*",
  },
  strokeStyle: { "dash-array": "*", "line-cap": "*" },
};

function _generatePropertyDefinitionSingle(
  varName: string,
  cssType: string,
  initialValue?: string,
) {
  const decls = [`syntax: '${cssType}'`, "inherits: true"];
  if (initialValue) {
    decls.push(`initial-value: ${initialValue}`);
  }
  return `@property ${varName} {\n  ${decls.join(";\n  ")};\n}`;
}

function isComputationallyIndependent(token: TokenTransformed) {
  return !token.token.aliasOf;
}

export function generatePropertyDefinition(varName: string, token: TokenTransformed) {
  const cssSyntax = TOKEN_TYPE_SYNTAX[token.token.$type] ?? "*";
  if (cssSyntax === "*" || !isComputationallyIndependent(token)) {
    return undefined;
  }
  if (token.type === "SINGLE_VALUE") {
    return _generatePropertyDefinitionSingle(varName, cssSyntax, token.value);
  } else if (token.type === "MULTI_VALUE") {
    const decls = [];
    for (const [name, subValue] of Object.entries(token.value)) {
      let subVarName = name === "." ? varName : `${varName}-${name}`;
      const subCssSyntax = SUB_PROPERTY_SYNTAX[token.token.$type]?.[name] ?? "*";
      if (subCssSyntax === "*" || (typeof subValue === "string" && subValue.includes("var("))) {
        continue;
      }
      decls.push(_generatePropertyDefinitionSingle(subVarName, subCssSyntax, subValue));
    }
    if (decls.length > 0) {
      return decls.join("\n");
    } else {
      return undefined;
    }
  }
}

function getMediaQuery(modifierName: string, modifierValue: string) {
  switch (modifierName) {
    case "theme":
      let suffix = "";
      if (modifierValue.endsWith("-high-contrast")) {
        modifierValue = modifierValue.substring(0, modifierValue.length - 14);
        suffix = " and (prefers-contrast: more)";
      }
      return `(prefers-color-scheme: ${modifierValue})${suffix}`;
    case "motion":
      if (modifierValue === "reduced") {
        return "(prefers-reduced-motion: reduce)";
      }
      break;
  }
  return undefined;
}

function generateToken(output: string[], token: TokenTransformed) {
  if (!token) return;
  if (token.type === "SINGLE_VALUE") {
    output.push(`  ${token.localID}: ${token.value};`);
  } else if (token.type === "MULTI_VALUE") {
    for (const [name, subValue] of Object.entries(token.value)) {
      output.push(`  ${token.localID}-${name}: ${subValue};`);
    }
    const shorthand = generateShorthand({
      token: { ...token.token, $value: token.value as any },
      localID: token.localID!,
      omitTypographyShorthand: false,
    });
    if (shorthand) {
      output.push(`  ${token.localID}: ${shorthand};`);
    }
  }
}

export default function buildAll(output: string[], { getTransforms, resolver }: BuildHookOptions) {
  const defaultTokensById: Record<string, TokenTransformed> = {};
  for (const token of getTransforms({ format: CSS_FORMAT_ID })) {
    const localID = token.localID;
    if (!localID) {
      continue;
    }
    defaultTokensById[token.id] = token;
    var prop = generatePropertyDefinition(localID, token);
    if (prop) {
      output.push(prop);
    }
  }

  const rootSelectors = [":root"];
  for (const item of resolver.source.resolutionOrder) {
    switch (item.type) {
      case "set":
        output.push(`/** set=${item.name} */`);
        output.push(`${rootSelectors.join(", ")} {`);
        walkGroups(item.sources, (id) => {
          const token = defaultTokensById[id];
          if (token) {
            generateToken(output, token);
          }
        });
        output.push("}");
        break;
      case "modifier":
        output.push(`/** modifier=${item.name} */`);
        for (const context of Object.keys(item.contexts)) {
          output.push(`/**  modifier=${item.name} context=${context} */`);
          const isDefault = context === item.default;
          const contextTokens = getTransforms({
            format: CSS_FORMAT_ID,
            input: { [item.name]: context },
          });
          const contextTokensById: Record<string, TokenTransformed> = {};
          for (const token of contextTokens) {
            if (token.localID) {
              contextTokensById[token.id] = token;
            }
          }
          const outputTmp: string[] = [];
          walkGroups(item.contexts[context], (id) => {
            const token = contextTokensById[id];
            if (token) {
              generateToken(outputTmp, token);
            }
          });
          const mediaQuery = !isDefault && getMediaQuery(item.name, context);
          if (mediaQuery) {
            output.push(`@media ${mediaQuery} { :root {`);
            output.push(...outputTmp);
            output.push("}}");
          }
          output.push(`${isDefault ? ":root, " : ""}[data-${item.name}="${context}"] {`);
          output.push(...outputTmp);
          output.push("}");
        }
        const modifierRootSelector = `[data-${item.name}]`;
        if (!rootSelectors.includes(modifierRootSelector)) {
          rootSelectors.push(modifierRootSelector);
        }
        break;
    }
  }
}
