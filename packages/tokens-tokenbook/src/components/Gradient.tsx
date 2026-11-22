// linear, radial, ...
import React from "react";
import type { CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { TokenValue } from "./TokenValue.tsx";

import "./Gradient.css";

export type GradientSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a box filled with the resolved gradient stops (rendered as a linear gradient) */
export function GradientSample(props: GradientSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const stops = useTokenCss(token);
  return (
    <div className="tb-gradient-sample tb-sample-row" style={style}>
      <div className="tb-gradient-sample__preview">
        <div className="tb-sample-checkerboard">
          <div
            className="tb-gradient-sample__gradient"
            style={{ background: `linear-gradient(90deg, ${stops})` }}
          ></div>
        </div>
      </div>
      <TokenValue token={token} value={stops} />
    </div>
  );
}
