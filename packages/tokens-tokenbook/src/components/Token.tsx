import type { Token } from "@hommel/tokens-generator";
import React from "react";

import { useTokenMap, useTokenRef, type TokenRefProps } from "../context.tsx";
import { BorderSample } from "./Border.tsx";
import { BorderRadiusSample } from "./BorderRadius.tsx";
import { ColorSample } from "./Color.tsx";
import { CubicBezierSample } from "./CubicBezier.tsx";
import { DimensionSample } from "./Dimension.tsx";
import { GradientSample } from "./Gradient.tsx";
import { OpacitySample } from "./Opacity.tsx";
import { PrimitiveSample } from "./Primitive.tsx";
import { ShadowSample } from "./Shadow.tsx";
import { SpacingSample } from "./Spacing.tsx";
import { StrokeStyleSample } from "./StrokeStyle.tsx";
import { TokenMeta } from "./TokenMeta.tsx";
import { TransitionSample } from "./Transition.tsx";
import { FontFamilySample, FontWeightSample, TypographySample } from "./Typography.tsx";

import "./Token.css";

export type TokenPreviewProps = TokenRefProps;

/** renders the appropriate preview component for `token.type` */
export function TokenPreview(props: TokenPreviewProps) {
  const token = useTokenRef(props);
  switch (token.type) {
    case "color":
      return <ColorSample token={token} />;
    case "dimension": {
      switch (token.extensions?.subtype) {
        case "radius":
          return <BorderRadiusSample token={token} />;
        case "spacing":
        case "gap":
          return <SpacingSample token={token} />;
      }
      const idLower = token.id.toLowerCase();
      if (idLower.includes("radius")) {
        return <BorderRadiusSample token={token} />;
      } else if (
        idLower.includes("spacing") ||
        idLower.includes("padding") ||
        idLower.includes("margin") ||
        idLower.includes("gap")
      ) {
        return <SpacingSample token={token} />;
      } else {
        return <DimensionSample token={token} />;
      }
    }
    case "border":
      return <BorderSample token={token} />;
    case "strokeStyle":
      return <StrokeStyleSample token={token} />;
    case "shadow":
      return <ShadowSample token={token} />;
    case "gradient":
      return <GradientSample token={token} />;
    case "transition":
      return <TransitionSample token={token} />;
    case "typography":
      return <TypographySample token={token} />;
    case "fontFamily":
      return <FontFamilySample token={token} />;
    case "fontWeight":
      return <FontWeightSample token={token} />;
    case "cubicBezier":
      return <CubicBezierSample token={token} />;
    case "number":
      const idLower = token.id.toLowerCase();
      if (
        token.extensions?.subtype === "opacity" ||
        idLower.includes("opacity") ||
        idLower.includes("alpha")
      ) {
        return <OpacitySample token={token} />;
      }
      return <PrimitiveSample token={token} />;
    default:
      return <PrimitiveSample token={token} />;
  }
}

export type TokenRowProps = TokenRefProps;

/** a row of a `TokenPalette`: the token's `TokenMeta` (name column) alongside its `TokenPreview` (sample column) */
export function TokenRow(props: TokenRowProps) {
  const token = useTokenRef(props);
  return (
    <div className="tb-token-row">
      <div className="tb-token-row__name">
        <TokenMeta token={token} />
      </div>
      <div className="tb-token-row__sample">
        <TokenPreview token={token} />
      </div>
    </div>
  );
}

export interface TokenPaletteProps {
  tokens?: (Token | string)[];
}

/** a two-column list ([name, sample]) of `TokenRow`s for a collection of tokens (by id or resolved `Token`) */
export function TokenPalette({ tokens }: TokenPaletteProps) {
  if (!tokens) {
    const tokenMap = useTokenMap();
    tokens = Array.from(tokenMap.values());
  }
  return (
    <div className="tb-token-palette">
      {tokens.map((t) => (
        <TokenRow key={typeof t === "string" ? t : t.id} token={t} />
      ))}
    </div>
  );
}
