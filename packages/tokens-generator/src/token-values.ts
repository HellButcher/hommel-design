/** DTCG 2025.10 token value types, keyed by `$type` */

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
  // not part of DTCG, but supported by terrazzo
  string: string;
  boolean: boolean;
  link: string;
}

export type TokenType = keyof TokenValueTypes;

/** `type` + `value` pair, discriminated by `type` */
export type TypedValue<T extends TokenType = TokenType> = {
  [K in T]: { type: K; value: ValueOrAlias<TokenValueTypes[K]> };
}[T];

/** value of a token whose type is unknown (alias to an unknown token) */
export interface UntypedValue {
  type?: undefined;
  value: unknown;
}
