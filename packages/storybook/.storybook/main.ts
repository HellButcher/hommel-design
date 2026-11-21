import type { StorybookConfig } from "storybook-solidjs-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    {
      name: "@hommel/tokens-storybook",
      options: {
        config: "../../tokens/tokens.config.ts",
      },
    },
  ],
  framework: "storybook-solidjs-vite",
  core: {
    disableTelemetry: true,
  },
};
export default config;
