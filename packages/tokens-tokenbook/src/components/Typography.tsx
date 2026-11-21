// Typography, Font Family, FontWeight, FontStyle, FontSize, LineHeight, LetterSpacing
import React from 'react';
import type { CSSProperties } from "react";
import { typographyProperties } from "@hommel/tokens-generator-css";
import { useTokenDocument, useModifierInput, useTokenRef, type TokenRefProps, useTokenCss } from "../context.tsx";
import "./Typography.css";

export type TypeSampleProps = TokenRefProps & {
  sampleText?: string;
  style?: CSSProperties;
};

/** sample text styled with the resolved typography shorthand, plus its sub-properties */
export function TypeSample(props: TypeSampleProps) {
  const { sampleText = "The quick brown fox", style, ...ref } = props;
  const token = useTokenRef(ref);
  if (token.type !== 'typography') throw new Error(`Token ${token.id} is not typography`);
  const font = useTokenCss(token);
  const typographtProps = typographyProperties(token.value, id => `--${id.replace('.', '-')}`);
  return (
    <div className="tb-type-sample" style={style}>
      <div className="tb-type-sample__preview" style={{ font }}>
        {sampleText}
      </div>
      {typographtProps && (
        <table className="tb-type-sample__props">
          <tbody>
            {Object.entries(typographtProps).map(([key, value]) => (
              <tr key={key}>
                <td className="tb-type-sample__prop-name">{key}</td>
                <td>
                  <code className="tb-type-sample__prop-value">{value}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <code className="tb-type-sample__label">{token.id}</code>
    </div>
  );
}
