// Typography, Font Family, FontWeight, FontStyle, FontSize, LineHeight, LetterSpacing
import React from "react";
import type { CSSProperties } from "react";

import { useTokenRef, type TokenRefProps, useTokenCss } from "../context.tsx";
import { TokenValue } from "./TokenValue.tsx";

import "./Typography.css";

export const DEFAULT_SAMPLE_TEXT =
  "The quick brown fox jumps over the lazy dog.\nLorem ipsum dolor sit amet, consectetur adipiscing elit.";

export type TypographySampleProps = TokenRefProps & {
  sampleText?: string;
  style?: CSSProperties;
};

/** font name rendered using itself, beside its resolved value */
export function FontFamilySample(props: TypographySampleProps) {
  const { sampleText = DEFAULT_SAMPLE_TEXT, style, ...ref } = props;
  const token = useTokenRef(ref);
  const fontFamily = useTokenCss(token);
  return (
    <div className="tb-font-family-sample tb-sample-row-vert" style={style}>
      <div className="tb-typography-sample__preview" style={{ fontFamily }}>
        {sampleText}
      </div>
      <TokenValue token={token} value={fontFamily} />
    </div>
  );
}

/** "Aa" sample rendered with the resolved font weight, beside its resolved value */
export function FontWeightSample(props: TypographySampleProps) {
  const { sampleText = DEFAULT_SAMPLE_TEXT, style, ...ref } = props;
  const token = useTokenRef(ref);
  const fontWeight = useTokenCss(token);
  return (
    <div className="tb-font-weight-sample tb-sample-row-vert" style={style}>
      <div className="tb-typography-sample__preview" style={{ fontWeight }}>
        {sampleText}
      </div>
      <TokenValue token={token} value={fontWeight} />
    </div>
  );
}

/** sample text styled with the resolved typography shorthand, plus its sub-properties as a table */
export function TypographySample(props: TypographySampleProps) {
  const { sampleText = DEFAULT_SAMPLE_TEXT, style, ...ref } = props;
  const token = useTokenRef(ref);
  if (token.type !== "typography") throw new Error(`Token ${token.id} is not typography`);
  const font = useTokenCss(token);
  return (
    <div className="tb-typography-sample tb-sample-row-vert" style={style}>
      <div className="tb-typography-sample__preview" style={{ font }}>
        {sampleText}
      </div>
      <TokenValue token={token} value={font} />
    </div>
  );
}
