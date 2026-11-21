import React from 'react';
import type { CSSProperties } from "react";
import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import "./Color.css";

export type ColorSwatchProps = TokenRefProps & {
  size?: number;
  style?: CSSProperties;
};

/** a single color swatch with the token id below it */
export function ColorSwatch(props: ColorSwatchProps) {
  const { size = 48, style, ...ref } = props;
  const token = useTokenRef(ref);
  const color = useTokenCss(token);
  return (
    <div className="tb-color-swatch" style={style}>
      <div className="tb-color-swatch__preview" style={{ width: size, height: size }} title={color}>
        <div className="tb-color-swatch__fill" style={{ background: color }} />
      </div>
      <code className="tb-color-swatch__label">{token.id}</code>
    </div>
  );
}

