// use-case-specific dimension sample: visualizes a border-radius on a square
import React from "react";
import type { CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { DEFAULT_SIZE } from "./defaults.ts";

import "./BorderRadius.css";
import { TokenValue } from "./TokenValue.tsx";

export type BorderRadiusSampleProps = TokenRefProps & {
  size?: number;
  style?: CSSProperties;
};

/** a square outlined box with the resolved border-radius applied to one corner */
export function BorderRadiusSample(props: BorderRadiusSampleProps) {
  const { size = DEFAULT_SIZE, style, ...ref } = props;
  const token = useTokenRef(ref);
  const value = useTokenCss(token);
  return (
    <div className="tb-border-radius-sample tb-sample-row" style={style}>
      <div
        className="tb-border-radius-sample__preview"
        style={{ borderRadius: value, width: size, height: size }}
      />
      <TokenValue token={token} value={value} />
    </div>
  );
}
