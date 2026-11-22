import { defineMain } from "storybook-solidjs-vite";

export default defineMain({
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
  features: {
    sidebarOnboardingChecklist: false,
  },
  core: {
    disableTelemetry: true,
  },
});
