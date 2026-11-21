import * as React from "react";
import { useEffect } from "react";
import { addons, types, useChannel } from "storybook/manager-api";
import { AddonPanel } from "storybook/internal/components";
import { TokenDocument, type TokenResolverDocument } from "@hommel/tokens-generator";
import { TokenGrid, TokensProvider } from "@hommel/tokens-tokenbook";
import "@hommel/tokens-tokenbook/style.css";
import { ADDON_ID, EVENTS, PANEL_ID } from "./constants.ts";
import { TokensThemeBridge } from "./theme-vars.ts";


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
  const ids = [...document.defaultTokens.keys()];
  return (
    <TokensThemeBridge withFont={true}>
      <TokensProvider document={document}>
        <TokenGrid tokens={ids} />
      </TokensProvider>
    </TokensThemeBridge>
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
