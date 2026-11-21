import React from 'react';
import type { CSSProperties } from "react";
import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import "./StrokeStyle.css";

export type StrokeStyleSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a horizontal rule drawn with the resolved border style */
export function StrokeStyleSample(props: StrokeStyleSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const value = useTokenCss(token);
  return (
    <div className="tb-stroke-style-sample" style={style}>
      <div className="tb-stroke-style-sample__preview" style={{ borderTopStyle: value as CSSProperties["borderTopStyle"] }} />
      <code className="tb-stroke-style-sample__label">
        {token.id}: <span className="tb-stroke-style-sample__value">{value}</span>
      </code>
    </div>
  );
}
