
import { TokenDocument, type TokenResolverDocument } from "@hommel/tokens-generator";
import { useChannel, useEffect } from "storybook/internal/preview-api";
import type { DecoratorFunction } from "storybook/internal/types";
import tokenDocumentJson from "virtual:@hommel/tokens-storybook/document"; // provided by the `viteFinal` plugin registered in ./preset.ts
import { EVENTS } from "./constants";

/** the resolved document, hydrated client-side from the build-time (Node) load in `preset.ts` */
export const tokensDocument = TokenDocument.fromJSON(tokenDocumentJson as TokenResolverDocument);

export default tokensDocument;

export const withTokenbookDocumentRoundtrip: DecoratorFunction = (StoryFn) => {
  const emit = useChannel({
    [EVENTS.REQUEST_DOCUMENT]: () => {
      emit(EVENTS.DOCUMENT, tokenDocumentJson);
    },
  });
  useEffect(() => {
    emit(EVENTS.DOCUMENT, tokenDocumentJson);
  });
  return StoryFn();
};
