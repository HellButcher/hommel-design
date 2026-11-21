import React from 'react';
import type { CSSProperties } from "react";
import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import "./Border.css";

export type BorderSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a box outlined with the resolved border shorthand */
export function BorderSample(props: BorderSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const border = useTokenCss(token);
  return (
    <div className="tb-border-sample" style={style}>
      <div className="tb-border-sample__preview" style={{ border }} />
      <code className="tb-border-sample__label">{token.id}</code>
    </div>
  );
}
