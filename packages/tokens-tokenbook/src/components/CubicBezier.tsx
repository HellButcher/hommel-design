import type { CubicBezierValue } from "@hommel/tokens-generator";
import React from "react";
import type { CSSProperties } from "react";

import { useResolvedToken, useTokenRef, type TokenRefProps } from "../context.tsx";
import { DEFAULT_SIZE } from "./defaults.ts";

import "./CubicBezier.css";
import { TokenValue } from "./TokenValue.tsx";

export type CubicBezierSampleProps = TokenRefProps & {
  size?: number;
  style?: CSSProperties;
};

export function CubicBezierSample(props: CubicBezierSampleProps) {
  const { size = DEFAULT_SIZE, style, ...ref } = props;
  const token = useTokenRef(ref);
  if (token.type !== "cubicBezier") throw new Error(`Token ${token.id} is not a cubicBezier`);
  const resolved = useResolvedToken(token);
  const bezier = resolved.value as CubicBezierValue;
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = bezier;
  const path = `M 0 100 C ${x1 * 100} ${100 - y1 * 100}, ${x2 * 100} ${100 - y2 * 100}, 100 0`;
  const value = `cubic-bezier(${bezier.join(", ")})`;
  return (
    <div className="tb-cubic-bezier-sample tb-sample-row" style={style}>
      <div className="tb-cubic-bezier-sample__preview" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="tb-cubic-bezier-sample__curve"
        >
          <path d={path} fill="none" strokeWidth={4} />
        </svg>
      </div>
      <TokenValue token={token} value={value} />
    </div>
  );
}
