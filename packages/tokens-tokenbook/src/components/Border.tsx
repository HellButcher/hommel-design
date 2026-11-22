import React from "react";
import type { CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { DEFAULT_SIZE } from "./defaults.ts";

import "./Border.css";
import { TokenValue } from "./TokenValue.tsx";

export type BorderSampleProps = TokenRefProps & {
  size?: number;
  style?: CSSProperties;
};

/** a box outlined with the resolved border shorthand */
export function BorderSample(props: BorderSampleProps) {
  const { size = DEFAULT_SIZE, style, ...ref } = props;
  const token = useTokenRef(ref);
  const border = useTokenCss(token);
  return (
    <div className="tb-border-sample tb-sample-row" style={style}>
      <div className="tb-border-sample__preview" style={{ border, width: size, height: size }} />
      <TokenValue token={token} value={border} />
    </div>
  );
}
