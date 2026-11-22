import { styled, type Theme } from "storybook/theming/emotion";

/** maps the active `storybook/theming` theme onto tokenbook's own `--tb-*` custom properties */
export function tokenbookThemeVars(theme: Theme): Record<string, string> {
  // tints relative to the content surface (rather than theme.appBg/barBg, which can be too
  // close to appContentBg in some themes) so muted/sunken surfaces stay visibly distinct
  const surfaceTint = (percent: number) =>
    `color-mix(in srgb, ${theme.textColor} ${percent}%, ${theme.background.content})`;
  return {
    "--tb-ink-default": theme.fgColor.default,
    "--tb-ink-muted": theme.fgColor.muted,
    "--tb-ink-subtle": theme.fgColor.muted,
    "--tb-surface-default": theme.background.content,
    "--tb-surface-muted": theme.background.preview,
    "--tb-surface-sunken": surfaceTint(10),
    "--tb-font-mono": theme.fontCode,
    "--tb-accent": theme.colorSecondary,

    "--tb-border-block": `1px solid ${theme.appBorderColor}`,
    "--tb-radius-block": `${theme.appBorderRadius}px`,
    "--tb-shadow-block":
      theme.base === "light"
        ? "rgba(0, 0, 0, 0.10) 0 1px 3px 0"
        : "rgba(0, 0, 0, 0.20) 0 2px 5px 0",
  };
}

// sets tokenbook's own `--tb-*` tokens directly from the active `storybook/theming` theme
// so the previews follow the whole theme, not just its light/dark base
export const TokensThemeBridge = styled.div(({ theme }) => tokenbookThemeVars(theme));
