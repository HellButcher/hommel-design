import React from "react";
import { useState, useRef } from "react";

import { useTokenRef, useVarName, type TokenRefProps } from "../context.tsx";

import "./TokenMeta.css";

export type TokenMetaProps = TokenRefProps;

/** copy-to-clipboard icon; purely decorative (the id text + tooltip already describe the action) */
function CopyIcon() {
  return (
    <svg
      className="tb-token-meta__copy-icon"
      width={12}
      height={12}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        d="M6 1.5h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1M6 1.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5m-5-10v10M3 4.5h1M3 7.5h1"
      />
      <rect
        x="3"
        y="4.5"
        width="8"
        height="9"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
      />
    </svg>
  );
}

/** the token's css variable name (bold) and description; click copies `var(--foo-bar)`, hover shows the original token id */
export function TokenMeta(props: TokenMetaProps) {
  const token = useTokenRef(props);
  const varName = useVarName();
  const cssVar = varName(token.id);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function copy() {
    void navigator.clipboard?.writeText(`var(${cssVar})`);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="tb-token-meta" onClick={copy} title={token.id}>
      <span
        className={`tb-token-meta__id${token.deprecated ? " tb-token-meta__id--deprecated" : ""}`}
      >
        {cssVar}
        <CopyIcon />
      </span>
      {token.type && <span className="tb-token-meta__type">{token.type}</span>}
      {token.description && <span className="tb-token-meta__description">{token.description}</span>}
      <span
        className={`tb-token-meta__copied${copied ? " tb-token-meta__copied--visible" : ""}`}
        aria-live="polite"
      >
        Copied!
      </span>
    </button>
  );
}
