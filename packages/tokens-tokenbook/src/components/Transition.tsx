import React from "react";
import { useState, type CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { TokenValue } from "./TokenValue.tsx";

import "./Transition.css";

export type TransitionSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** a box that moves between two positions using the resolved transition, toggled on click */
export function TransitionSample(props: TransitionSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const transition = useTokenCss(token);
  const [active, setActive] = useState(false);
  return (
    <div className="tb-transition-sample tb-sample-row" style={style}>
      <button
        type="button"
        className="tb-transition-sample__track"
        onClick={() => setActive((v) => !v)}
      >
        <div
          className={`tb-transition-sample__thumb${active ? " tb-transition-sample__thumb--active" : ""}`}
          style={{ transition: `all ${transition}` }}
        />
      </button>
      <TokenValue token={token} value={transition} />
    </div>
  );
}
