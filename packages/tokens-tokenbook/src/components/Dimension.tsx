// Size, Spacing/Padding/Margin/Gaps, BorderWidth, BorderRadius
import React from 'react';
import type { CSSProperties } from "react";
import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import "./Dimension.css";

export type DimensionSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a bar whose width equals the resolved dimension, alongside its CSS value */
export function DimensionSample(props: DimensionSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const value = useTokenCss(token);
  return (
    <div className="tb-dimension-sample" style={style}>
      <code className="tb-dimension-sample__label">{token.id}</code>
      <div className="tb-dimension-sample__track">
        <div className="tb-dimension-sample__bar" style={{ width: value }} />
      </div>
      <code className="tb-dimension-sample__label tb-dimension-sample__value">{value}</code>
    </div>
  );
}
