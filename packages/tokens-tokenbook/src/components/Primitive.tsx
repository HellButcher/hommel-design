import React from 'react';
import type { CSSProperties } from "react";
import { useTokenCss, useTokenDocument, useModifierInput, useTokenRef, type TokenRefProps } from "../context.tsx";
import "./Primitive.css";

export type PrimitiveSampleProps = TokenRefProps & {
  style?: CSSProperties;
};

/** generic label/value row for `number`, `duration`, `cubicBezier`, `string`, `boolean`, `link` tokens */
export function PrimitiveSample(props: PrimitiveSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const value = useTokenCss(token);
  return (
    <div className="tb-primitive-sample" style={style}>
      <code className="tb-primitive-sample__label">{token.id}</code>
      <code className="tb-primitive-sample__value">{value}</code>
    </div>
  );
}

/** font name rendered using itself */
export function FontFamilySample(props: PrimitiveSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const fontFamily = useTokenCss(token);
  return (
    <div className="tb-font-family-sample" style={style}>
      <div className="tb-font-family-sample__preview" style={{ fontFamily }}>
        The quick brown fox jumps over the lazy dog
      </div>
      <code className="tb-font-family-sample__label">
        {token.id}: {fontFamily}
      </code>
    </div>
  );
}

/** "Aa" sample rendered with the resolved font weight */
export function FontWeightSample(props: PrimitiveSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  const fontWeight = useTokenCss(token);
  return (
    <div className="tb-font-weight-sample" style={style}>
      <div className="tb-font-weight-sample__row">
        <div className="tb-font-weight-sample__preview" style={{ fontWeight }}>
          Aa
        </div>
        <code className="tb-font-weight-sample__label">
          {token.id}: {fontWeight}
        </code>
      </div>
    </div>
  );
}

/** mini easing-curve preview for `cubicBezier` tokens */
export function CubicBezierSample(props: PrimitiveSampleProps) {
  const { style, ...ref } = props;
  const token = useTokenRef(ref);
  if (token.type !== 'cubicBezier') throw new Error(`Token ${token.id} is not a cubicBezier`);
  const bezier = token.value;
  // toto: resolve values
  const x1 = bezier[0] ?? 0;
  const y1 = bezier[1] ?? 0;
  const x2 = bezier[2] ?? 1;
  const y2 = bezier[3] ?? 1;
  const path = `M 0 100 C ${x1 * 100} ${100 - y1 * 100}, ${x2 * 100} ${100 - y2 * 100}, 100 0`;
  return (
    <div className="tb-cubic-bezier-sample" style={style}>
      <div className="tb-cubic-bezier-sample__row">
        <svg width={48} height={48} viewBox="0 0 100 100" className="tb-cubic-bezier-sample__curve">
          <path d={path} fill="none" strokeWidth={4} />
        </svg>
        <code className="tb-cubic-bezier-sample__label">{token.id}</code>
      </div>
    </div>
  );
}
