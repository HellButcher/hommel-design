import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';
import scss from '@terrazzo/plugin-scss';
import { makeCSSVar } from '@terrazzo/token-tools/css';
import customCss from '@hommel/terrazzo-plugin-custom-css';

function permutations(fg: string|string[], bg: string|string[], options = {}) {
  if (!Array.isArray(fg)) fg = [fg];
  if (!Array.isArray(bg)) bg = [bg];
  const result = [];
  for (const foreground of fg) {
    for (const background of bg) {
      result.push({ foreground, background, ...options });
    }
  }
  return result;
}

function stripInitialIndent(s: string) {
  if (!s) return s;
  if (s.startsWith('\n')) s = s.slice(1);
  const m = s.match(/^[ \t]*(?=\S)/);
  if (!m) {
    return s;
  }
  const indent = m[0].length;
	if (indent === 0) {
		return s;
	}
	return s.replace(new RegExp(`^[ \\t]{${indent}}`, 'gm'), '');
}

export default defineConfig({
  tokens: ['./src/hommel-design.resolver.json'],
  outDir: './dist/',
  lint: {
    build: { enabled: true },
    rules: {
      'core/valid-color': 'error',
      'core/valid-dimension': 'error',
      'core/valid-font-family': 'error',
      'core/valid-font-weight': 'error',
      'core/valid-duration': 'error',
      'core/valid-cubic-bezier': 'error',
      'core/valid-number': 'error',
      'core/valid-link': 'error',
      'core/valid-boolean': 'error',
      'core/valid-string': 'error',
      'core/valid-stroke-style': 'error',
      'core/valid-border': 'error',
      'core/valid-transition': 'error',
      'core/valid-shadow': 'error',
      'core/valid-gradient': 'error',
      'core/valid-typography': 'error',
      'core/consistent-naming': ["warn", { format: "kebab-case" }],
      "a11y/min-contrast": [
        "warn",
        {
          level: "AA",
          pairs: [
            ...permutations(
              ["color.text.primary", "color.accent-ink", "color.secondary-ink"],
              ["color.background.default", "color.background.surface", "color.background.elevated"]
            ),
            {
              foreground: "color.text.inverse",
              background: "color.background.inverse",
            },
            {
              foreground: "color.on-accent",
              background: "color.accent",
            },
            {
              foreground: "color.on-secondary",
              background: "color.secondary",
            },
            {
              foreground: "color.disabled.text",
              background: "color.disabled.background"
            }
          ],
        },
      ],
    }
  },
  plugins: [
    css({
      // Skip bundling, we have our own plugin for this (that used the transform)
      skipBuild: true,
      variableName: t => makeCSSVar(t.id, {prefix: 'h'}),
      permutations: [
        { input: {}, prepare: (contents) => contents },
        { input: { theme: "dark" }, prepare: (contents) => contents },
        { input: { density: "compact" }, prepare: (contents) => contents },
        { input: { motion: "reduced" }, prepare: (contents) => contents },
      ],
    }),
    customCss({
      filename: 'index.css'
    }),
    scss(),
  ],
});
