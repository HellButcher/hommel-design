import type { TokenDocument } from "./load.ts";
import { isObject } from "./token-values.ts";
import { resolveToken } from "./tokens.ts";
import type { TokenDiagnostic, TokenMap, ValidationConfig } from "./types.ts";

function colorChannels(id: string, tokens: TokenMap): [number, number, number] | undefined {
  const token = resolveToken(id, tokens);
  if (token.type !== "color" || !isObject(token.value) || token.value.colorSpace !== "srgb") {
    return undefined;
  }
  const components = token.value.components;
  if (!Array.isArray(components) || components.length !== 3 || !components.every(Number.isFinite)) {
    return undefined;
  }
  return [components[0]!, components[1]!, components[2]!];
}

function luminance(channels: [number, number, number]): number {
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(foreground: string, background: string, tokens: TokenMap) {
  const fg = colorChannels(foreground, tokens);
  const bg = colorChannels(background, tokens);
  if (!fg || !bg) return undefined;
  const first = luminance(fg);
  const second = luminance(bg);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function contextInputs(document: TokenDocument, visit: (input: Record<string, string>) => void) {
  const modifiers = document.resolutionOrder.filter((item) => item.type === "modifier");
  const walk = (index: number, input: Record<string, string>) => {
    if (index === modifiers.length) {
      visit(input);
      return;
    }
    const modifier = modifiers[index]!;
    for (const context of Object.keys(modifier.contexts)) {
      walk(index + 1, { ...input, [modifier.name]: context });
    }
  };
  walk(0, {});
}

function checkNames(document: TokenDocument): TokenDiagnostic[] {
  const diagnostics: TokenDiagnostic[] = [];
  const tokens = new Map(
    document.resolutionOrder.flatMap((item) =>
      item.type === "set"
        ? [...item.tokens]
        : Object.values(item.contexts).flatMap((context) => [...context]),
    ),
  );
  for (const token of tokens.values()) {
    if (!/^(?:[a-z0-9]+(?:[-.][a-z0-9]+)*)$/.test(token.id)) {
      diagnostics.push({
        severity: "warning",
        message: "Token name is not kebab-case",
        token: token.id,
        where: token.source,
      });
    }
  }
  return diagnostics;
}

function checkContextParity(document: TokenDocument): TokenDiagnostic[] {
  const diagnostics: TokenDiagnostic[] = [];
  for (const item of document.resolutionOrder) {
    if (item.type !== "modifier") continue;
    const contexts = Object.entries(item.contexts);
    const first = contexts[0];
    if (!first) continue;
    const expected = [...first[1].keys()].sort();
    for (const [name, tokens] of contexts.slice(1)) {
      const actual = [...tokens.keys()].sort();
      if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
        diagnostics.push({
          severity: "warning",
          message: `Context token names differ from "${first[0]}"`,
          where: `modifier "${item.name}" context "${name}"`,
        });
      }
    }
  }
  return diagnostics;
}

function checkContrast(document: TokenDocument, config: NonNullable<ValidationConfig["contrast"]>) {
  const diagnostics: TokenDiagnostic[] = [];
  const minimum = config.minimum ?? 4.5;
  if (!Number.isFinite(minimum) || minimum <= 1) {
    return [
      {
        severity: "error",
        message: "Contrast minimum must be a finite number greater than 1",
      } satisfies TokenDiagnostic,
    ];
  }
  contextInputs(document, (input) => {
    const tokens = document.resolve(input);
    for (const pair of config.pairs) {
      if (!tokens.has(pair.foreground) || !tokens.has(pair.background)) continue;
      const ratio = contrastRatio(pair.foreground, pair.background, tokens);
      if (ratio === undefined) {
        diagnostics.push({
          severity: "warning",
          message: "Contrast could not be calculated for non-sRGB color values",
          token: `${pair.foreground} on ${pair.background}`,
        });
      } else if (ratio < minimum) {
        diagnostics.push({
          severity: "warning",
          message: `Contrast ${ratio.toFixed(2)}:1 is below ${minimum}:1`,
          token: `${pair.foreground} on ${pair.background}`,
        });
      }
    }
  });
  return diagnostics;
}

/** combines parse/load diagnostics with the optional configured checks */
export function validateDocument(
  document: TokenDocument,
  config: ValidationConfig = {},
): TokenDiagnostic[] {
  const diagnostics = [...document.diagnostics, ...checkContextParity(document)];
  if (config.kebabCase) diagnostics.push(...checkNames(document));
  if (config.contrast) diagnostics.push(...checkContrast(document, config.contrast));
  const unique = new Map<string, TokenDiagnostic>();
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.severity}:${diagnostic.where ?? ""}:${diagnostic.token ?? ""}:${diagnostic.message}`;
    unique.set(key, diagnostic);
  }
  return [...unique.values()];
}
