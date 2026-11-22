import React from "react";
import type { CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { TokenValue } from "./TokenValue.tsx";

import "./Shadow.css";

export type ShadowSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a box using the resolved `box-shadow` */
export function ShadowSample(props: ShadowSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const boxShadow = useTokenCss(token);
  return (
    <div className="tb-shadow-sample tb-sample-row" style={style}>
      <div className="tb-shadow-sample__stage">
        <div className="tb-shadow-sample__preview" style={{ boxShadow }} />
      </div>
      <TokenValue token={token} value={boxShadow} />
    </div>
  );
}
