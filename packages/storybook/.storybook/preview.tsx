import addonTokensStorybook from "@hommel/tokens-storybook";
import { TokensDocsContainer } from "@hommel/tokens-storybook/blocks";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "storybook-solidjs-vite";
import { themes } from "storybook/theming";
import "./styles.css";

export default definePreview({
  addons: [addonDocs(), addonTokensStorybook()],
  parameters: {
    docs: {
      theme: themes.dark,
      container: TokensDocsContainer,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
});
