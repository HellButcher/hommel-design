// linear, radial, ...
import React from 'react';
import type { CSSProperties } from "react";
import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import "./Gradient.css";

export type GradientSwatchProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a box filled with the resolved gradient stops (rendered as a linear gradient) */
export function GradientSwatch(props: GradientSwatchProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const stops = useTokenCss(token);
  return (
    <div className="tb-gradient-swatch" style={style}>
      <div className="tb-gradient-swatch__preview" style={{ background: `linear-gradient(90deg, ${stops})` }} />
      <code className="tb-gradient-swatch__label">{token.id}</code>
    </div>
  );
}
