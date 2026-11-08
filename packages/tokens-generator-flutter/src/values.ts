import {
  parseAlias,
  toColor,
  type ColorValue,
  type FontWeightKeyword,
  type ShadowLayerValue,
  type TokenType,
  type TypedValue,
  type TypographyValue,
  type UntypedValue,
  type ValueOrAlias,
} from "@hommel/tokens-generator";

import { dartDouble, dartInt, dartString } from "./dart.ts";

/** resolves an alias target token id to the Dart expression referencing it */
export type RefFn = (aliasId: string) => string;

export interface DartConvertOptions {
  ref: RefFn;
  /** pixels per `rem`, since Flutter has no browser root font-size */
  remPx: number;
  /** mark literal (non-alias) composite expressions with `const`; only safe when `ref` itself
   * resolves aliases into further literal expressions (see `createLiteralRef`) */
  literal?: boolean;
}

const FONT_WEIGHTS: Readonly<Record<FontWeightKeyword, number>> = {
  thin: 100,
  hairline: 100,
  "extra-light": 200,
  "ultra-light": 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  "semi-bold": 600,
  "demi-bold": 600,
  bold: 700,
  "extra-bold": 800,
  "ultra-bold": 800,
  black: 900,
  heavy: 900,
  "extra-black": 950,
  "ultra-black": 950,
};

/** Dart type used for each token `$type` */
export function dartType(type: TokenType | undefined): string {
  switch (type) {
    case "color":
      return "Color";
    case "dimension":
      return "double";
    case "duration":
      return "Duration";
    case "fontFamily":
      return "String";
    case "fontWeight":
      return "FontWeight";
    case "cubicBezier":
      return "Curve";
    case "number":
      return "double";
    case "strokeStyle":
      return "BorderStyle";
    case "border":
      return "TokenBorderValue";
    case "transition":
      return "TokenTransitionValue";
    case "shadow":
      return "List<BoxShadow>";
    case "gradient":
      return "LinearGradient";
    case "typography":
      return "TextStyle";
    case "string":
    case "link":
      return "String";
    case "boolean":
      return "bool";
    case undefined:
      return "Object";
  }
}

function colorExpr(value: ColorValue): string {
  const srgb = toColor(value).to("srgb");
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const toByte = (n: number) => Math.round(clamp01(n) * 255);
  const r = toByte(Number(srgb.coords[0] ?? 0));
  const g = toByte(Number(srgb.coords[1] ?? 0));
  const b = toByte(Number(srgb.coords[2] ?? 0));
  const a = toByte(srgb.alpha ?? 1);
  const hex = [a, r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  return `const Color(0x${hex})`;
}

function fontWeightExpr(value: number | FontWeightKeyword): string {
  const weight = typeof value === "number" ? value : FONT_WEIGHTS[value];
  const step = Math.min(900, Math.max(100, Math.round(weight / 100) * 100));
  return `FontWeight.w${step}`;
}

function borderStyleExpr(value: ValueOrAlias<unknown>): string {
  // Flutter's `BorderStyle` only has `solid`/`none`; dashed/dotted/custom dash patterns are unsupported
  return value === "none" ? "BorderStyle.none" : "BorderStyle.solid";
}

/** converts a token value to a Dart expression; aliases become references to the aliased token's Dart name */
export function toDart(v: TypedValue | UntypedValue, options: DartConvertOptions): string {
  const { ref, remPx, literal } = options;
  const maybeConst = (expr: string) => (literal ? `const ${expr}` : expr);
  const refOrValue = <T>(value: ValueOrAlias<T>, fn: (value: T) => string): string => {
    const alias = parseAlias(value);
    return alias ? ref(alias) : fn(value as T);
  };
  const dart = (sub: TypedValue): string => toDart(sub, options);
  const dimensionValue = (d: { value: number; unit: "px" | "rem" }) =>
    dartDouble(d.unit === "rem" ? d.value * remPx : d.value);
  const durationMs = (d: { value: number; unit: "ms" | "s" }) =>
    dartInt(d.unit === "s" ? d.value * 1000 : d.value);

  switch (v.type) {
    case "color":
      return refOrValue(v.value, colorExpr);
    case "dimension":
      return refOrValue(v.value, dimensionValue);
    case "duration":
      return refOrValue(v.value, (d) => maybeConst(`Duration(milliseconds: ${durationMs(d)})`));
    case "fontFamily":
      return refOrValue(v.value, (f) => dartString(Array.isArray(f) ? f[0]! : f));
    case "fontWeight":
      return refOrValue(v.value, fontWeightExpr);
    case "cubicBezier":
      return refOrValue(v.value, (b) => maybeConst(`Cubic(${b.map(dartDouble).join(", ")})`));
    case "number":
      return refOrValue(v.value, dartDouble);
    case "string":
      return refOrValue(v.value, dartString);
    case "boolean":
      return refOrValue(v.value, (b) => (b ? "true" : "false"));
    case "link":
      return refOrValue(v.value, dartString);
    case "strokeStyle":
      return refOrValue(v.value, borderStyleExpr);
    case "border":
      return refOrValue(
        v.value,
        (b) =>
          maybeConst(
            `TokenBorderValue(${dart({ type: "color", value: b.color })}, ` +
              `${dart({ type: "dimension", value: b.width })}, ` +
              `${dart({ type: "strokeStyle", value: b.style })})`,
          ),
      );
    case "shadow":
      return refOrValue(v.value, (shadow) => {
        const layers = Array.isArray(shadow) ? shadow : [shadow];
        const items = layers.map((layer) =>
          refOrValue<ShadowLayerValue>(layer, (s) =>
            [
              "BoxShadow(",
              `color: ${dart({ type: "color", value: s.color })}, `,
              `offset: Offset(${dart({ type: "dimension", value: s.offsetX })}, ${dart({ type: "dimension", value: s.offsetY })}), `,
              `blurRadius: ${dart({ type: "dimension", value: s.blur })}, `,
              `spreadRadius: ${dart({ type: "dimension", value: s.spread })}`,
              ")",
            ].join(""),
          ),
        );
        return maybeConst(`[${items.join(", ")}]`);
      });
    case "transition":
      return refOrValue(
        v.value,
        (t) =>
          maybeConst(
            `TokenTransitionValue(${dart({ type: "duration", value: t.duration })}, ` +
              `${dart({ type: "duration", value: t.delay })}, ` +
              `${dart({ type: "cubicBezier", value: t.timingFunction })})`,
          ),
      );
    case "gradient":
      return refOrValue(v.value, (stops) => {
        const colors = stops.map((stop) =>
          refOrValue(stop, (s) => dart({ type: "color", value: s.color })),
        );
        const positions = stops.map((stop) =>
          refOrValue(stop, (s) => dart({ type: "number", value: s.position })),
        );
        return maybeConst(`LinearGradient(colors: [${colors.join(", ")}], stops: [${positions.join(", ")}])`);
      });
    case "typography":
      return refOrValue(v.value, (t) => maybeConst(typographyExpr(t, options)));
    case undefined:
      return refOrValue(v.value, (value) => {
        if (typeof value === "string") return dartString(value);
        if (typeof value === "number") return dartDouble(value);
        throw new Error(`Unsupported value without type: ${JSON.stringify(value)}`);
      });
  }
}

function typographyExpr(value: TypographyValue, options: DartConvertOptions): string {
  const dart = (sub: TypedValue) => toDart(sub, options);
  return (
    "TextStyle(" +
    `fontFamily: ${dart({ type: "fontFamily", value: value.fontFamily })}, ` +
    `fontSize: ${dart({ type: "dimension", value: value.fontSize })}, ` +
    `fontWeight: ${dart({ type: "fontWeight", value: value.fontWeight })}, ` +
    `letterSpacing: ${dart({ type: "dimension", value: value.letterSpacing })}, ` +
    `height: ${dart({ type: "number", value: value.lineHeight })})`
  );
}
