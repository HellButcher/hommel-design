import React from 'react';
import type { Token } from "@hommel/tokens-generator";
import { useTokenRef, type TokenRefProps } from "../context.tsx";
import { ColorSwatch } from "./Color.tsx";
import { DimensionSample } from "./Dimension.tsx";
import { BorderSample } from "./Border.tsx";
import { StrokeStyleSample } from "./StrokeStyle.tsx";
import { ShadowSample } from "./Shadow.tsx";
import { GradientSwatch } from "./Gradient.tsx";
import { TransitionDemo } from "./Transition.tsx";
import { TypeSample } from "./Typography.tsx";
import { CubicBezierSample, FontFamilySample, FontWeightSample, PrimitiveSample } from "./Primitive.tsx";
import "./Token.css";

export type TokenPreviewProps = TokenRefProps;

/** renders the appropriate preview component for `token.type` */
export function TokenPreview(props: TokenPreviewProps) {
  const token = useTokenRef(props);
  switch (token.type) {
    case "color":
      return <ColorSwatch token={token} />;
    case "dimension":
      return <DimensionSample token={token} />;
    case "border":
      return <BorderSample token={token} />;
    case "strokeStyle":
      return <StrokeStyleSample token={token} />;
    case "shadow":
      return <ShadowSample token={token} />;
    case "gradient":
      return <GradientSwatch token={token} />;
    case "transition":
      return <TransitionDemo token={token} />;
    case "typography":
      return <TypeSample token={token} />;
    case "fontFamily":
      return <FontFamilySample token={token} />;
    case "fontWeight":
      return <FontWeightSample token={token} />;
    case "cubicBezier":
      return <CubicBezierSample token={token} />;
    default:
      return <PrimitiveSample token={token} />;
  }
}

export type TokenRowProps = TokenRefProps;

/** a token's metadata (id, description, deprecation) alongside its preview */
export function TokenRow(props: TokenRowProps) {
  const token = useTokenRef(props);
  return (
    <div className="tb-token-row">
      <div className="tb-token-row__preview">
        <TokenPreview token={token} />
      </div>
      <div className="tb-token-row__meta">
        <div className={`tb-token-row__id${token.deprecated ? " tb-token-row__id--deprecated" : ""}`}>
          {token.id}
          {token.deprecated ? " (deprecated)" : ""}
        </div>
        {token.description && <div className="tb-token-row__description">{token.description}</div>}
      </div>
    </div>
  );
}

export interface TokenGridProps {
  tokens: (Token | string)[];
}

/** a list of `TokenRow`s for a collection of tokens (by id or resolved `Token`) */
export function TokenGrid({ tokens }: TokenGridProps) {
  return (
    <div className="tb-token-grid">
      {tokens.map((t) => (
        <TokenRow key={typeof t === "string" ? t : t.id} token={t} />
      ))}
    </div>
  );
}
