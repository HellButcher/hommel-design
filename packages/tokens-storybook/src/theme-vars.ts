import { styled, type Theme } from "storybook/theming/emotion";

/** maps the active `storybook/theming` theme onto tokenbook's own `--tb-*` custom properties */
export function tokenbookThemeVars(theme: Theme): Record<string, string> {
  const shadowTint = (percent: number) => `color-mix(in srgb, ${theme.textColor} ${percent}%, transparent)`;
  return {
    "--tb-text-default": theme.textColor,
    "--tb-text-muted": theme.textMutedColor,
    "--tb-text-subtle": theme.textMutedColor,
    "--tb-border-default": theme.appBorderColor,
    "--tb-border-strong": theme.inputBorder,
    "--tb-surface-default": theme.appContentBg,
    "--tb-surface-muted": theme.appBg,
    "--tb-surface-sunken": theme.barBg,
    "--tb-font-mono": theme.fontCode,
    "--tb-radius-sm": `${theme.appBorderRadius}px`,
    "--tb-radius-md": `${theme.appBorderRadius * 2}px`,
    "--tb-accent": theme.colorSecondary,
    "--tb-shadow-sm": `0 1px 2px ${shadowTint(10)}`,
    "--tb-shadow-md": `0 2px 10px ${shadowTint(16)}`,
    "--tb-checker-light": shadowTint(14),
  };
}


// sets tokenbook's own `--tb-*` tokens directly from the active `storybook/theming` theme
// so the previews follow the whole theme, not just its light/dark base
export const TokensThemeBridge = styled.div<{ withFont?: boolean }>(({ withFont, theme }) => {
  if (withFont) {
    return {
      color: theme.textColor,
      fontFamily: theme.fontBase,
      ...tokenbookThemeVars(theme),
    };
  } else {
    return {
      ...tokenbookThemeVars(theme),
    };
  }
});
