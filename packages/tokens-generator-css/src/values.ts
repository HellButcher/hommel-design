import {
  parseAlias,
  toColor,
  type ColorValue,
  type FontWeightKeyword,
  type TypedValue,
  type TypographyValue,
  type UntypedValue,
  type ValueOrAlias,
} from "@hommel/tokens-generator";

export type VarName = (id: string) => string;

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

const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
]);

export function kebabCase(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function color(value: ColorValue): string {
  return toColor(value).toString();
}

function fontFamily(name: string): string {
  return GENERIC_FONT_FAMILIES.has(name) || /^[a-zA-Z-][\w-]*$/.test(name)
    ? name
    : JSON.stringify(name);
}

/** converts a token value to a CSS value; aliases become `var()` references */
export function toCss(v: TypedValue | UntypedValue, varName: VarName): string {
  const ref = <T>(value: ValueOrAlias<T>, fn: (value: T) => string): string => {
    const alias = parseAlias(value);
    return alias ? `var(${varName(alias)})` : fn(value as T);
  };
  const css = (sub: TypedValue) => toCss(sub, varName);

  switch (v.type) {
    case "color":
      return ref(v.value, color);
    case "dimension":
    case "duration":
      return ref(v.value, (d) => `${d.value}${d.unit}`);
    case "fontFamily":
      return ref(v.value, (f) => (Array.isArray(f) ? f : [f]).map(fontFamily).join(", "));
    case "fontWeight":
      return ref(v.value, (w) => String(typeof w === "number" ? w : FONT_WEIGHTS[w]));
    case "cubicBezier":
      return ref(v.value, (b) => `cubic-bezier(${b.join(", ")})`);
    case "number":
    case "string":
      return ref(v.value, String);
    case "boolean":
      return ref(v.value, (b) => (b ? "1" : "0"));
    case "link":
      return ref(v.value, (l) => `url(${JSON.stringify(l)})`);
    case "strokeStyle":
      // CSS has no custom dash patterns
      return ref(v.value, (s) => (typeof s === "string" ? s : "dashed"));
    case "border":
      return ref(v.value, (b) =>
        [
          css({ type: "dimension", value: b.width }),
          css({ type: "strokeStyle", value: b.style }),
          css({ type: "color", value: b.color }),
        ].join(" "),
      );
    case "shadow":
      return ref(v.value, (shadow) =>
        (Array.isArray(shadow) ? shadow : [shadow])
          .map((layer) =>
            ref(layer, (s) =>
              [
                s.inset ? "inset" : "",
                css({ type: "dimension", value: s.offsetX }),
                css({ type: "dimension", value: s.offsetY }),
                css({ type: "dimension", value: s.blur }),
                css({ type: "dimension", value: s.spread }),
                css({ type: "color", value: s.color }),
              ]
                .filter(Boolean)
                .join(" "),
            ),
          )
          .join(", "),
      );
    case "transition":
      return ref(v.value, (t) =>
        [
          css({ type: "duration", value: t.duration }),
          css({ type: "cubicBezier", value: t.timingFunction }),
          css({ type: "duration", value: t.delay }),
        ].join(" "),
      );
    case "gradient":
      return ref(v.value, (stops) =>
        stops
          .map((stop) =>
            ref(stop, (s) => {
              const pos =
                typeof s.position === "number"
                  ? `${s.position * 100}%`
                  : `calc(${css({ type: "number", value: s.position })} * 100%)`;
              return `${css({ type: "color", value: s.color })} ${pos}`;
            }),
          )
          .join(", "),
      );
    case "typography":
      return ref(v.value, (t) => {
        const props = typographyProperties(t, varName);
        return `${props.fontWeight} ${props.fontSize}/${props.lineHeight} ${props.fontFamily}`;
      });
    case undefined:
      return ref(v.value, (value) => {
        if (typeof value === "string" || typeof value === "number") return String(value);
        throw new Error(`Unsupported value without type: ${JSON.stringify(value)}`);
      });
  }
}

/** CSS values of the typography properties */
export function typographyProperties(
  value: ValueOrAlias<TypographyValue>,
  varName: VarName,
): Record<keyof TypographyValue, string> {
  if (typeof value === "string") {
    const alias = parseAlias(value);
    if (!alias) throw new Error(`Invalid alias: ${value}`);
    const subVarName = (key: keyof TypographyValue) => varName(`${alias}.${key}`);
    return {
      fontFamily: `var(${subVarName("fontFamily")})`,
      fontSize: `var(${subVarName("fontSize")})`,
      fontWeight: `var(${subVarName("fontWeight")})`,
      letterSpacing: `var(${subVarName("letterSpacing")})`,
      lineHeight: `var(${subVarName("lineHeight")})`,
    };
  } else {
    const css = (sub: TypedValue) => toCss(sub, varName);
    return {
      fontFamily: css({ type: "fontFamily", value: value.fontFamily }),
      fontSize: css({ type: "dimension", value: value.fontSize }),
      fontWeight: css({ type: "fontWeight", value: value.fontWeight }),
      letterSpacing: css({ type: "dimension", value: value.letterSpacing }),
      lineHeight: css({ type: "number", value: value.lineHeight }),
    };
  }
}
