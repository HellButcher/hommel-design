import { defineConfig } from "@hommel/tokens-generator";
import css from "@hommel/tokens-generator-css";

export default defineConfig({
  resolver: "./src/hommel-design.resolver.json",
  outDir: "./dist/",
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
