import type { Token } from "@hommel/tokens-generator";
import React from "react";

import { useVarName } from "../context.tsx";

import "./TokenValue.css";

export interface TokenValueProps {
  token: Token;
  /** the resolved (inlined) CSS value to display */
  value: string;
}

/** the resolved raw value of a token, plus (for aliases) the `var(--foo-bar)` reference it was resolved from */
export function TokenValue({ token, value }: TokenValueProps) {
  const varName = useVarName();
  return (
    <div className="tb-token-value">
      <code className="tb-token-value__raw">{value}</code>
      {token.aliasOf && (
        <code className="tb-token-value__alias">var({varName(token.aliasOf)})</code>
      )}
    </div>
  );
}
