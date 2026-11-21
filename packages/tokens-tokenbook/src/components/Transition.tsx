import React from 'react';
import { useState, type CSSProperties } from "react";
import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import "./Transition.css";

export type TransitionDemoProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a box that moves between two positions using the resolved transition, toggled on click */
export function TransitionDemo(props: TransitionDemoProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const transition = useTokenCss(token);
  const [active, setActive] = useState(false);
  return (
    <div className="tb-transition-demo" style={style}>
      <button type="button" className="tb-transition-demo__track" onClick={() => setActive((v) => !v)}>
        <div
          className={`tb-transition-demo__thumb${active ? " tb-transition-demo__thumb--active" : ""}`}
          style={{ transition: `all ${transition}` }}
        />
      </button>
      <code className="tb-transition-demo__label">{token.id}</code>
    </div>
  );
}
