import { defineConfig } from "vite";
import solidPlugin from "@solidjs/vite-plugin";

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
  },
  resolve: {
    conditions: ["development", "browser"],
  },
});
