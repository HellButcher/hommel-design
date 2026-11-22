import React from "react";
import type { CSSProperties } from "react";

import { useTokenCss, useTokenRef, type TokenRefProps } from "../context.tsx";
import { TokenValue } from "./TokenValue.tsx";

export type PrimitiveSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** generic value display for `number`, `duration`, `string`, `boolean`, `link` tokens */
export function PrimitiveSample(props: PrimitiveSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const value = useTokenCss(token);
  return (
    <div className="tb-primitive-sample" style={style}>
      <TokenValue token={token} value={value} />
    </div>
  );
}
