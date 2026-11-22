import type {
  Globals,
  GlobalTypes,
  DecoratorFunction,
  ProjectAnnotations,
  Renderer,
} from "storybook/internal/types";

import tokensDocument, { withTokenbookDocumentRoundtrip } from "./host-document.ts";

import "@hommel/tokens-tokenbook/style.css";

export const decorators: DecoratorFunction[] = [withTokenbookDocumentRoundtrip];

export const initialGlobals: Globals = Object.fromEntries(
  tokensDocument.modifiers.map((modifier) => [
    modifier.name,
    tokensDocument.defaultInput[modifier.name],
  ]),
);

export const globalTypes: GlobalTypes = Object.fromEntries(
  tokensDocument.modifiers.map((modifier) => [
    modifier.name,
    {
      name: modifier.name,
      description: modifier.description ?? modifier.name,
      toolbar: {
        icon: "paintbrush",
        items: Object.keys(modifier.contexts),
        dynamicTitle: true,
      },
    },
  ]),
);

const preview: ProjectAnnotations<Renderer> = {
  decorators,
  initialGlobals,
  globalTypes,
};

export default preview;
