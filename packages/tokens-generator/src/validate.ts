import type { Algorithms } from "colorjs.io/src/contrast/index.js";

import type { TokenDocument } from "./document.ts";
import { isColor, toColor } from "./token-values.ts";
import { resolveToken } from "./tokens.ts";
import type { Token } from "./types.ts";
import type { ContrastConfig, ValidationConfig } from "./types.ts";

export type ContrastAlgorithm = Algorithms;

function checkNames(document: TokenDocument) {
  const tokens = new Map(
    document.resolutionOrder.flatMap((item) =>
      item.type === "set"
        ? [...item.tokens]
        : Object.values(item.contexts).flatMap((context) => [...context]),
    ),
  );
  for (const token of tokens.values()) {
    const id = token.id.replace(/\.\$root$/, "");
    if (!/^(?:[a-z0-9]+(?:[-.][a-z0-9]+)*)$/.test(id)) {
      document.warning("Token name is not kebab-case", token);
    }
  }
}

function contrastRatio(fgToken: Token, bgToken: Token, algorithm: ContrastAlgorithm = "WCAG21") {
  if (fgToken.type !== "color" || !isColor(fgToken.value)) return undefined;
  if (bgToken.type !== "color" || !isColor(bgToken.value)) return undefined;
  const fgColor = toColor(fgToken.value);
  const bgColor = toColor(bgToken.value);
  return fgColor.contrast(bgColor, algorithm);
}

function checkContrast(document: TokenDocument, config: ContrastConfig) {
  const minimum = config.minimum ?? 4.5;
  if (!Number.isFinite(minimum) || minimum <= 1) {
    document.error(`Invalid contrast minimum ${minimum}`);
    return;
  }
  if (!config.pairs?.length) return;
  for (const pair of config.pairs) {
    if (pair.minimum !== undefined && (!Number.isFinite(pair.minimum) || pair.minimum <= 1)) {
      document.warning(
        `Invalid contrast minimum ${pair.minimum} for pair ${pair.foreground} on ${pair.background}`,
      );
      delete pair.minimum;
    }
  }
  for (const input of document.allModifierPermutations) {
    const tokens = document.resolve(input);
    for (const pair of config.pairs) {
      const pair_minimum = pair.minimum ?? minimum;
      let fgToken;
      try {
        fgToken = resolveToken(pair.foreground, tokens);
      } catch (error) {
        document.warning(
          `Foreground token "${pair.foreground}" could not be resolved for input "${JSON.stringify(input)}: ${(error as Error).message}`,
        );
        fgToken = undefined;
      }
      let bgToken;
      try {
        bgToken = resolveToken(pair.background, tokens);
      } catch (error) {
        document.warning(
          `Background token "${pair.background}" could not be resolved for input "${JSON.stringify(input)}: ${(error as Error).message}`,
        );
        bgToken = undefined;
      }
      if (!fgToken || !bgToken) continue;
      const ratio = contrastRatio(fgToken, bgToken, config.algorithm);
      if (ratio === undefined) {
        document.warning(
          `Contrast could not be calculated for the given color values with input ${JSON.stringify(input)}`,
        );
      } else if (ratio < pair_minimum) {
        document.warning(
          `Contrast ${ratio.toFixed(2)} for pair ${pair.foreground} on ${pair.background} is below ${pair_minimum} with input ${JSON.stringify(input)}`,
        );
      }
    }
  }
}

/** combines parse/load diagnostics with the optional configured checks */
export function checkDocument(document: TokenDocument, config: ValidationConfig = {}) {
  if (config.kebabCase) checkNames(document);
  if (config.contrast) checkContrast(document, config.contrast);
}
