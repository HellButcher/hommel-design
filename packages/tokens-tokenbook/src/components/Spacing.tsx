// use-case-specific dimension sample: visualizes spacing as a gap between two blocks
import React from "react";
import type { CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { TokenValue } from "./TokenValue.tsx";

import "./Spacing.css";

export type SpacingSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** two blocks separated by the resolved spacing value */
export function SpacingSample(props: SpacingSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const value = useTokenCss(token);
  return (
    <div className="tb-spacing-sample tb-sample-row" style={style}>
      <div className="tb-spacing-sample__track" style={{ gap: value }}>
        <div className="tb-spacing-sample__block" />
        <div className="tb-spacing-sample__block" />
      </div>
      <TokenValue token={token} value={value} />
    </div>
  );
}
