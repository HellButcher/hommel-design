import { defineConfig } from "@hommel/tokens-generator";
import css from "@hommel/tokens-generator-css";

export default defineConfig({
  resolver: "./src/hommel-design.resolver.json",
  outDir: "./dist/",
  validation: {
    kebabCase: true,
    contrast: {
      minimum: 4.5,
      pairs: [
        ...["color.text.primary", "color.accent-ink", "color.secondary-ink"].flatMap((foreground) =>
          ["color.background.default", "color.background.surface", "color.background.elevated"].map(
            (background) => ({ foreground, background }),
          ),
        ),
        { foreground: "color.text.inverse", background: "color.background.inverse" },
        { foreground: "color.on-accent", background: "color.accent" },
        { foreground: "color.on-secondary", background: "color.secondary" },
        { foreground: "color.disabled.text", background: "color.disabled.background" },
      ],
    },
  },
  plugins: [
    css({
      filename: "index.css",
      prefix: "h",
      mediaQueries: {
        theme: { dark: "(prefers-color-scheme: dark)" },
        motion: { reduced: "(prefers-reduced-motion: reduce)" },
      },
    }),
  ],
});
