import { toColor, type ColorValue } from "@hommel/tokens-generator";
import React from "react";
import type { CSSProperties } from "react";

import { useResolvedToken, useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { DEFAULT_SIZE } from "./defaults.ts";

import "./Color.css";
import { TokenValue } from "./TokenValue.tsx";

export type ColorSampleProps = TokenRefProps & {
  size?: number;
  style?: CSSProperties;
};

/** a single color swatch, with its resolved value below */
export function ColorSample(props: ColorSampleProps) {
  const { size = DEFAULT_SIZE, style, ...ref } = props;
  const token = useTokenRef(ref);
  const color = useTokenCss(token);
  const resolved = useResolvedToken(token);
  const colorValue = resolved.type === "color" ? (resolved.value as ColorValue) : undefined;
  const alpha = colorValue?.alpha ?? 1;
  return (
    <div className="tb-color-sample tb-sample-row" style={style}>
      <div className="tb-color-sample__preview" style={{ width: size, height: size }}>
        {alpha < 1 && colorValue ? (
          <div className="tb-sample-checkerboard">
            <div
              className="tb-color-sample__fill tb-color-sample__fill--opaque"
              style={{ background: toColor({ ...colorValue, alpha: 1 }).toString() }}
            />
            <div
              className="tb-color-sample__fill tb-color-sample__fill--alpha"
              style={{ background: color }}
            />
          </div>
        ) : (
          <div className="tb-color-sample__fill" style={{ background: color }} />
        )}
      </div>
      <TokenValue token={token} value={color} />
    </div>
  );
}
