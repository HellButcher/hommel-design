import { type Plugin, type TokenDocument } from "@hommel/tokens-generator";

import { camelCase, createNameRegistry } from "./dart.ts";
import {
  buildModifierInfos,
  classifyTokens,
  createLiteralRef,
  createValueRef,
  generateContextClasses,
  generateEnum,
  type ModifierInfo,
  type TokenClassification,
} from "./modifiers.ts";
import { dartType, toDart } from "./values.ts";

export const PLUGIN_NAME = "@hommel/tokens-generator-flutter";

export interface FlutterPluginOptions {
  /** output file, defaults to `design_tokens.dart` */
  filename?: string;
  /** name of the generated facade class, defaults to `Tokens` */
  className?: string;
  /** pixels per `rem`, since Flutter has no browser root font-size; defaults to `16` */
  remPx?: number;
  /** let the `Tokens` class itself implement `ThemeExtension<Tokens>` when a modifier literally
   * named `theme` exists; defaults to `true` */
  themeExtension?: boolean;
}

/** Dart source for helper value classes, emitted only when actually referenced by a token */
const HELPER_CLASSES: Readonly<Record<string, string>> = {
  TokenBorderValue: [
    "class TokenBorderValue {",
    "  final Color color;",
    "  final double width;",
    "  final BorderStyle style;",
    "  const TokenBorderValue(this.color, this.width, this.style);",
    "}",
  ].join("\n"),
  TokenTransitionValue: [
    "class TokenTransitionValue {",
    "  final Duration duration;",
    "  final Duration delay;",
    "  final Curve curve;",
    "  const TokenTransitionValue(this.duration, this.delay, this.curve);",
    "}",
  ].join("\n"),
};

function generateTokensClass(
  document: TokenDocument,
  classification: TokenClassification,
  modifierInfos: ModifierInfo[],
  nameFor: (id: string) => string,
  className: string,
  remPx: number,
  implementsThemeExtension: boolean,
): string {
  const ownerByModifier = new Map(modifierInfos.map((info) => [info.modifier.name, info]));
  const ref = createValueRef(classification, nameFor, { kind: "tokens" });
  const literalRef = createLiteralRef(document, remPx);

  const ctorParams = modifierInfos
    .map((info) => `this.${info.fieldName} = ${info.enumName}.${info.defaultMemberName}`)
    .join(", ");
  const fields = modifierInfos
    .map((info) => `  final ${info.enumName} ${info.fieldName};`)
    .join("\n");

  const constants = [...document.defaultTokens.entries()]
    .filter(([id]) => !classification.dynamic.has(id))
    .map(([id, token]) => {
      const name = nameFor(id);
      const type = dartType(token.type);
      const expr = toDart(token, { ref: literalRef, remPx, literal: true });
      return `  /// token id: ${id}\n  final ${type} ${name} = ${expr};`;
    })
    .join("\n\n");

  const modifierFields = modifierInfos
    .map((info) => `  late final ${info.variantClassName} ${info.accessorName};`)
    .join("\n");

  const ctorBody = modifierInfos
    .map((info) => {
      const cases = info.contexts
        .map((c) => `      ${info.enumName}.${c.memberName} => ${c.className}(this),`)
        .join("\n");
      return `    ${info.accessorName} = switch (${info.fieldName}) {\n${cases}\n    };`;
    })
    .join("\n");

  const getters = [...document.defaultTokens.entries()]
    .filter(([id]) => classification.dynamic.has(id))
    .map(([id, token]) => {
      const name = nameFor(id);
      const type = dartType(token.type);
      const owner = classification.ownerModifier.get(id);
      const expr =
        owner !== undefined
          ? `${ownerByModifier.get(owner)!.accessorName}.${name}`
          : toDart(token, { ref, remPx });
      return `  /// token id: ${id}\n  ${type} get ${name} => ${expr};`;
    })
    .join("\n\n");

  let themeMethods = "";
  if (implementsThemeExtension) {
    const copyWithParams = modifierInfos
      .map((info) => `${info.enumName}? ${info.fieldName}`)
      .join(", ");
    const copyWithArgs = modifierInfos
      .map((info) => `${info.fieldName}: ${info.fieldName} ?? this.${info.fieldName}`)
      .join(", ");
    themeMethods =
      `\n\n  @override\n` +
      `  ${className} copyWith({${copyWithParams}}) => ${className}(${copyWithArgs});\n\n` +
      `  @override\n` +
      `  ${className} lerp(ThemeExtension<${className}>? other, double t) {\n` +
      `    if (other is! ${className}) return this;\n` +
      `    return t < 0.5 ? this : other;\n` +
      `  }`;
  }

  const heritage = implementsThemeExtension ? ` extends ThemeExtension<${className}>` : "";

  return (
    `class ${className}${heritage} {\n` +
    `  ${className}({${ctorParams}}) {\n${ctorBody}\n  }\n\n` +
    `${fields}\n\n` +
    `${constants}\n\n` +
    `${modifierFields}\n\n` +
    `${getters}${themeMethods}\n` +
    `}`
  );
}

export default function flutter(options: FlutterPluginOptions = {}): Plugin {
  const filename = options.filename ?? "design_tokens.dart";
  const className = options.className ?? "Tokens";
  const remPx = options.remPx ?? 16;
  const themeExtensionEnabled = options.themeExtension ?? true;

  function generate(document: TokenDocument): string {
    const classification = classifyTokens(document);
    const nameFor = createNameRegistry(camelCase);
    const modifierInfos = buildModifierInfos(document, classification, className);
    const implementsThemeExtension =
      themeExtensionEnabled && modifierInfos.some((info) => info.modifier.name === "theme");

    const sections: string[] = [];

    for (const info of modifierInfos) sections.push(generateEnum(info));

    for (const info of modifierInfos) {
      sections.push(
        ...generateContextClasses(document, classification, info, nameFor, className, remPx),
      );
    }

    sections.push(
      generateTokensClass(
        document,
        classification,
        modifierInfos,
        nameFor,
        className,
        remPx,
        implementsThemeExtension,
      ),
    );

    const usedHelpers = Object.entries(HELPER_CLASSES)
      .filter(([name]) => sections.some((section) => section.includes(name)))
      .map(([, source]) => source);

    // `ThemeExtension` lives in `material.dart`, not `widgets.dart`
    const flutterImport = implementsThemeExtension
      ? "package:flutter/material.dart"
      : "package:flutter/widgets.dart";
    const header = [`// Generated by ${PLUGIN_NAME}. DO NOT EDIT!`, `import '${flutterImport}';`];

    return [header.join("\n"), ...usedHelpers, ...sections].join("\n\n") + "\n";
  }

  return {
    name: PLUGIN_NAME,
    build({ document, outputFile }) {
      outputFile(filename, generate(document));
    },
  };
}
