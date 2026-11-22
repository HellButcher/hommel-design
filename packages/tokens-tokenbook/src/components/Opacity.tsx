// use-case-specific number sample: visualizes opacity as a checkerboard + translucent overlay
import React from "react";
import type { CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { DEFAULT_SIZE } from "./defaults.ts";

import "./Opacity.css";
import { TokenValue } from "./TokenValue.tsx";

export type OpacitySampleProps = TokenRefProps & {
  size?: number;
  style?: CSSProperties;
};

/** a checkerboard box overlaid with a black fill at the resolved opacity */
export function OpacitySample(props: OpacitySampleProps) {
  const { size = DEFAULT_SIZE, style, ...ref } = props;
  const token = useTokenRef(ref);
  const value = useTokenCss(token);
  return (
    <div className="tb-opacity-sample tb-sample-row" style={style}>
      <div className="tb-opacity-sample__preview" style={{ width: size, height: size }}>
        <div className="tb-sample-checkerboard">
          <div className="tb-opacity-sample__fill-black" style={{ opacity: value }} />
          <div className="tb-opacity-sample__fill-white" style={{ opacity: value }} />
        </div>
      </div>
      <TokenValue token={token} value={value} />
    </div>
  );
}
