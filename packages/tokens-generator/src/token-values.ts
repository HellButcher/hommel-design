/** DTCG 2025.10 token value types, keyed by `$type` */

import ColorJsColor from "colorjs.io";

export type Alias = `{${string}}`;
export type ValueOrAlias<T> = T | Alias;

export type ColorSpace =
  | "srgb"
  | "srgb-linear"
  | "hsl"
  | "hwb"
  | "lab"
  | "lch"
  | "oklab"
  | "oklch"
  | "display-p3"
  | "a98-rgb"
  | "prophoto-rgb"
  | "rec2020"
  | "xyz-d65"
  | "xyz-d50";

export interface ColorValue {
  colorSpace: ColorSpace;
  components: [number | "none", number | "none", number | "none"];
  alpha?: number;
  hex?: string;
}

export interface DimensionValue {
  value: number;
  unit: "px" | "rem";
}

export interface DurationValue {
  value: number;
  unit: "ms" | "s";
}

export type FontFamilyValue = string | string[];

export type FontWeightKeyword =
  | "thin"
  | "hairline"
  | "extra-light"
  | "ultra-light"
  | "light"
  | "normal"
  | "regular"
  | "book"
  | "medium"
  | "semi-bold"
  | "demi-bold"
  | "bold"
  | "extra-bold"
  | "ultra-bold"
  | "black"
  | "heavy"
  | "extra-black"
  | "ultra-black";

export type FontWeightValue = number | FontWeightKeyword;

export type CubicBezierValue = [number, number, number, number];

export type StrokeStyleValue =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "groove"
  | "ridge"
  | "outset"
  | "inset"
  | {
      dashArray: ValueOrAlias<DimensionValue>[];
      lineCap: "round" | "butt" | "square";
    };

export interface BorderValue {
  color: ValueOrAlias<ColorValue>;
  width: ValueOrAlias<DimensionValue>;
  style: ValueOrAlias<StrokeStyleValue>;
}

export interface TransitionValue {
  duration: ValueOrAlias<DurationValue>;
  delay: ValueOrAlias<DurationValue>;
  timingFunction: ValueOrAlias<CubicBezierValue>;
}

export interface ShadowLayerValue {
  color: ValueOrAlias<ColorValue>;
  offsetX: ValueOrAlias<DimensionValue>;
  offsetY: ValueOrAlias<DimensionValue>;
  blur: ValueOrAlias<DimensionValue>;
  spread: ValueOrAlias<DimensionValue>;
  inset?: boolean;
}

export type ShadowValue = ShadowLayerValue | ValueOrAlias<ShadowLayerValue>[];

export interface GradientStopValue {
  color: ValueOrAlias<ColorValue>;
  position: ValueOrAlias<number>;
}

export type GradientValue = ValueOrAlias<GradientStopValue>[];

export interface TypographyValue {
  fontFamily: ValueOrAlias<FontFamilyValue>;
  fontSize: ValueOrAlias<DimensionValue>;
  fontWeight: ValueOrAlias<FontWeightValue>;
  letterSpacing: ValueOrAlias<DimensionValue>;
  lineHeight: ValueOrAlias<number>;
}

export interface TokenValueTypes {
  color: ColorValue;
  dimension: DimensionValue;
  fontFamily: FontFamilyValue;
  fontWeight: FontWeightValue;
  duration: DurationValue;
  cubicBezier: CubicBezierValue;
  number: number;
  strokeStyle: StrokeStyleValue;
  border: BorderValue;
  transition: TransitionValue;
  shadow: ShadowValue;
  gradient: GradientValue;
  typography: TypographyValue;
  // not part of DTCG, but supported by this generator
  string: string;
  boolean: boolean;
  link: string;
}

export type TokenType = keyof TokenValueTypes;

export type TokenValue<K extends TokenType | undefined> = K extends TokenType
  ? ValueOrAlias<TokenValueTypes[K]>
  : unknown;

/** `type` + `value` pair, discriminated by `type` */
export type TypedValue<T extends TokenType = TokenType> = {
  [K in T]: { type: K; value: TokenValue<K> };
}[T];

/** value of a token whose type is unknown (alias to an unknown token) */
export interface UntypedValue {
  type?: undefined;
  value: unknown;
}

const VALUE_ALIAS_RE = /^\{([^{}]+)\}$/;
const COLOR_SPACES = new Set([
  "srgb",
  "srgb-linear",
  "hsl",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "display-p3",
  "a98-rgb",
  "prophoto-rgb",
  "rec2020",
  "xyz-d65",
  "xyz-d50",
]);
const FONT_WEIGHTS = new Set([
  "thin",
  "hairline",
  "extra-light",
  "ultra-light",
  "light",
  "normal",
  "regular",
  "book",
  "medium",
  "semi-bold",
  "demi-bold",
  "bold",
  "extra-bold",
  "ultra-bold",
  "black",
  "heavy",
  "extra-black",
  "ultra-black",
]);
const STROKE_STYLES = new Set([
  "solid",
  "dashed",
  "dotted",
  "double",
  "groove",
  "ridge",
  "outset",
  "inset",
]);
const TOKEN_TYPES = new Set([
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
  "string",
  "boolean",
  "link",
]);

const TYPOGRAPHY_FIELD_TYPES: Record<keyof TypographyValue, TokenType> = {
  fontFamily: "fontFamily",
  fontSize: "dimension",
  fontWeight: "fontWeight",
  letterSpacing: "dimension",
  lineHeight: "number",
};

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAliasValue(value: unknown): value is Alias {
  return typeof value === "string" && VALUE_ALIAS_RE.test(value);
}

/** returns the referenced token id when `value` is an alias like `{color.teal.500}` */
export function parseAlias(value: unknown): string | undefined {
  return typeof value === "string" ? VALUE_ALIAS_RE.exec(value)?.[1] : undefined;
}

export function isDimension(value: unknown): value is DimensionValue {
  return (
    isObject(value) && isFiniteNumber(value.value) && (value.unit === "px" || value.unit === "rem")
  );
}

export function isDuration(value: unknown): value is DurationValue {
  return (
    isObject(value) && isFiniteNumber(value.value) && (value.unit === "ms" || value.unit === "s")
  );
}

export function isFontFamily(value: unknown): value is FontFamilyValue {
  return (
    (typeof value === "string" && value.length > 0) ||
    (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string"))
  );
}

export function isFontWeight(value: unknown): value is FontWeightValue {
  return (
    isFiniteNumber(value) ||
    (typeof value === "string" && FONT_WEIGHTS.has(value as FontWeightKeyword))
  );
}

export function isColor(value: unknown): value is ColorValue {
  return (
    isObject(value) &&
    typeof value.colorSpace === "string" &&
    COLOR_SPACES.has(value.colorSpace) &&
    Array.isArray(value.components) &&
    value.components.length === 3 &&
    value.components.every((component) => component === "none" || isFiniteNumber(component)) &&
    (value.alpha === undefined ||
      (isFiniteNumber(value.alpha) && value.alpha >= 0 && value.alpha <= 1)) &&
    (value.hex === undefined || typeof value.hex === "string")
  );
}

/** DTCG colorSpace ids that differ from colorjs.io ids */
const COLORJS_SPACES: Readonly<Partial<Record<ColorSpace, string>>> = {
  "display-p3": "p3",
  "a98-rgb": "a98rgb",
  "prophoto-rgb": "prophoto",
};

/** converts a DTCG color value to a colorjs.io `Color` instance */
export function toColor(value: ColorValue): ColorJsColor {
  const coords = value.components.map((c) => (c === "none" ? null : c)) as [
    number | null,
    number | null,
    number | null,
  ];
  return new ColorJsColor(
    COLORJS_SPACES[value.colorSpace] ?? value.colorSpace,
    coords,
    value.alpha ?? 1,
  );
}

export function isCubicBezier(value: unknown): value is CubicBezierValue {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(isFiniteNumber) &&
    value[0]! >= 0 &&
    value[0]! <= 1 &&
    value[2]! >= 0 &&
    value[2]! <= 1
  );
}

export function isStrokeStyle(value: unknown): value is StrokeStyleValue {
  return (
    (typeof value === "string" && STROKE_STYLES.has(value)) ||
    (isObject(value) &&
      Array.isArray(value.dashArray) &&
      value.dashArray.every((item) => isAliasValue(item) || isDimension(item)) &&
      ["round", "butt", "square"].includes(String(value.lineCap)))
  );
}

export function isBorder(value: unknown): value is BorderValue {
  return (
    isObject(value) &&
    (isAliasValue(value.color) || isColor(value.color)) &&
    (isAliasValue(value.width) || isDimension(value.width)) &&
    (isAliasValue(value.style) || isStrokeStyle(value.style))
  );
}

export function isTransition(value: unknown): value is TransitionValue {
  return (
    isObject(value) &&
    (isAliasValue(value.duration) || isDuration(value.duration)) &&
    (isAliasValue(value.delay) || isDuration(value.delay)) &&
    (isAliasValue(value.timingFunction) || isCubicBezier(value.timingFunction))
  );
}

export function isShadow(value: unknown): value is ShadowValue {
  return (
    (Array.isArray(value) && value.every((item) => isAliasValue(item) || isShadow(item))) ||
    (isObject(value) &&
      (isAliasValue(value.color) || isColor(value.color)) &&
      ["offsetX", "offsetY", "blur", "spread"].every(
        (key) => isAliasValue(value[key]) || isDimension(value[key]),
      ) &&
      (value.inset === undefined || typeof value.inset === "boolean"))
  );
}

export function isGradientStop(value: unknown): value is GradientStopValue {
  return (
    isObject(value) &&
    (isAliasValue(value.color) || isColor(value.color)) &&
    (isAliasValue(value.position) || isFiniteNumber(value.position))
  );
}

export function isGradient(value: unknown): value is GradientValue {
  return Array.isArray(value) && value.every((stop) => isAliasValue(stop) || isGradientStop(stop));
}

export function isTypography(value: unknown): value is TypographyValue {
  return (
    isObject(value) &&
    Object.entries(TYPOGRAPHY_FIELD_TYPES).every(([key, fieldType]) =>
      isTokenValue(fieldType, value[key]),
    )
  );
}

/** whether a parsed `$value` can be emitted by the generator for its declared type */
export function isTokenType(type: unknown): type is TokenType {
  return typeof type === "string" && TOKEN_TYPES.has(type);
}

/** whether a parsed `$value` can be emitted by the generator for its declared type */
export function isTokenValue<K extends TokenType | undefined>(
  type: K,
  value: unknown,
): value is TokenValue<K> {
  if (isAliasValue(value)) return true;
  if (type === undefined) return typeof value === "string" || isFiniteNumber(value);
  switch (type) {
    case "color":
      return isColor(value);
    case "dimension":
      return isDimension(value);
    case "fontFamily":
      return isFontFamily(value);
    case "fontWeight":
      return isFontWeight(value);
    case "duration":
      return isDuration(value);
    case "cubicBezier":
      return isCubicBezier(value);
    case "number":
      return isFiniteNumber(value);
    case "strokeStyle":
      return isStrokeStyle(value);
    case "border":
      return isBorder(value);
    case "transition":
      return isTransition(value);
    case "shadow":
      return isShadow(value);
    case "gradient":
      return isGradient(value);
    case "typography":
      return isTypography(value);
    case "string":
    case "link":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
  }
}
