import { TokenDocument, type TokenResolverDocument } from "@hommel/tokens-generator";
import {
  TokenMeta,
  TokenPreview,
  TokensProvider,
  useTokenMap,
  type TokenPaletteProps,
} from "@hommel/tokens-tokenbook";
import * as React from "react";
import { useEffect } from "react";
import { AddonPanel } from "storybook/internal/components";
import { addons, types, useChannel } from "storybook/manager-api";

import "@hommel/tokens-tokenbook/style.css";
import { styled } from "storybook/theming/emotion";

import { ADDON_ID, EVENTS, PANEL_ID } from "./constants.ts";
import { tokenbookThemeVars } from "./theme-vars.ts";

const TokensPanelRoot = styled.div(({ theme }) => {
  return {
    color: theme.textColor,
    fontFamily: theme.fontBase,
    background: theme.background.content,
    minHeight: "100%",
    position: "relative",
    ...tokenbookThemeVars(theme),
  };
});

const TokensTableStyled = styled.table`
  border-spacing: 0;
  font-size: 13px;
  line-height: 19px;
  text-align: start;
  width: 100%;
  margin: 0;
  background: ${({ theme }) => theme.background.app};

  th {
    color: ${({ theme }) => theme.fgColor.muted};
    background: ${({ theme }) => theme.background.app};
    text-align: start;
    padding-top: 10px;
    padding-bottom: 10px;
    padding-inline: 15px;
  }
  thead th:first-of-type,
  td:first-of-type {
    width: 25%;
  }
  th:first-of-type,
  td:first-of-type {
    padding-inline-start: 20px;
  }
  th:last-of-type,
  td:last-of-type {
    padding-inline-end: 20px;
  }
  tbody td {
    background: ${({ theme }) => theme.background.content};
    border-top: 1px solid ${({ theme }) => theme.appBorderColor};
    padding-top: 10px;
    padding-bottom: 10px;
  }
`;

export function TokensTable({ tokens }: TokenPaletteProps) {
  if (!tokens) {
    const tokenMap = useTokenMap();
    tokens = Array.from(tokenMap.values());
  }
  return (
    <TokensTableStyled>
      <thead>
        <tr>
          <th style={{ width: "25%" }}>Token</th>
          <th>Sample</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((t) => (
          <tr key={typeof t === "string" ? t : t.id}>
            <td>
              <TokenMeta token={t} />
            </td>
            <td>
              <TokenPreview token={t} />
            </td>
          </tr>
        ))}
      </tbody>
    </TokensTableStyled>
  );
}

function TokensPanel() {
  const [document, setDocument] = React.useState<TokenDocument>();
  const emit = useChannel({
    [EVENTS.DOCUMENT]: (data: TokenResolverDocument) => setDocument(TokenDocument.fromJSON(data)),
  });
  useEffect(() => {
    emit(EVENTS.REQUEST_DOCUMENT);
  }, [emit]);
  if (!document) {
    return <span>Loading tokens…</span>;
  }
  return (
    <TokensPanelRoot>
      <TokensProvider document={document}>
        <TokensTable />
      </TokensProvider>
    </TokensPanelRoot>
  );
}

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: "Tokens",
    match: () => true,
    render: ({ active }) => (
      <AddonPanel active={!!active}>
        <TokensPanel />
      </AddonPanel>
    ),
  });
});
