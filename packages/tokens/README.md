# Design Tokens for Hommel Design

DTCG 2025.10 tokens with teal as the primary accent and coral as the secondary
brand color. Colors use sRGB objects; dimensions and durations carry explicit units.

## Three Tiers

- **Primitive:** raw palette colors and numeric scales for spacing, font size,
  weight, radius, stroke, duration, easing, opacity, and shadows. Names describe
  values, never usage: `color.teal.600`, not `color.teal-hover`. Colors are
  grouped by hue with numeric shades, except standalone `color.white` and
  `color.black`. Every primitive contains literal values,
  never references, including inside composite values.
- **Semantic:** stable roles such as `color.accent-ink`, `typography.body`,
  `radius.control`, and `motion.duration.interaction`. All theme, density, and
  motion decisions live here. Semantic tokens reference primitives or other
  semantic roles.
- **Component:** a small set of primary-button slots, including hover, active,
  disabled, focus, typography, and sizing. Every slot references a semantic token,
  never a primitive or literal value. Add component slots only for real needs;
  other components can consume semantic roles directly.

Example resolution:

```text
button.primary.background -> color.action.primary -> color.accent -> color.teal.500
```

Sources are organized as follows:

```text
src/
    primitive/
        color.tokens.json
        spacing.tokens.json
        other.tokens.json
    semantic/
        other.tokens.json
        theme/{light,dark}.tokens.json
        density/{calm,compact}.tokens.json
        motion/{normal,reduced}.tokens.json
    component/
        button.tokens.json
    hommel-design.resolver.json
```

## Color and Contrast

The palette pairs **teal `#14b8a6`** with **coral `#fb826f`**. Primitive colors
are grouped into `teal`, `coral`, `green`, `amber`, `red`, `blue`, and `gray`
shade scales, with no `-ink` variants. White and near-black are standalone
`color.white` and `color.black` primitives, outside the gray scale. Shades are
raw choices, not promises of text contrast.

Readable text choices belong to semantic roles. For example,
`color.accent-ink` selects `color.teal.700` in light mode and `color.teal.500`
in dark mode. Use `color.on-accent` and `color.on-secondary` for text on brand
fills; both select near-black, not white. Semantic `-ink` names describe a text
role.

Contrast is measured after resolving semantic aliases in each context, not on
primitive colors in isolation. Example light-mode measurements against the
resolved `color.background.surface` (white):

| Resolved Semantic Foreground |   Ratio |
| ---------------------------- | ------: |
| `color.accent-ink`           |  5.47:1 |
| `color.secondary-ink`        |  5.73:1 |
| `color.status.success`       |  7.13:1 |
| `color.status.warning`       |  7.09:1 |
| `color.status.danger`        |  6.47:1 |
| `color.status.info`          |  6.70:1 |
| `color.text.primary`         | 15.34:1 |
| `color.text.secondary`       |  5.30:1 |

Components use semantic inks: light mode selects darker shades; dark mode
selects brighter shades instead. Tests require body text, accent inks, and
status colors to reach 4.5:1 on default, surface, and elevated backgrounds in
both themes. Button labels also reach 4.5:1 in every state. Control borders and
focus colors reach 3:1 against those surfaces; subtle borders are decorative,
not control boundaries. Contrast is guaranteed only for these tested pairings.

## Contexts and CSS

Defaults are `theme=light`, `density=calm`, and `motion=normal`. Each modifier
defines the same role names across its contexts. Compact density reduces control
padding and minimum height without shrinking type. Reduced motion sets semantic
durations to zero without modifying primitives. Calm controls have a 2.75rem
minimum height, compact controls 2.25rem; prefer calm for touch interfaces.

Build output is `dist/index.css`. Set `data-theme="light|dark"`,
`data-density="calm|compact"`, and `data-motion="normal|reduced"` on the root
`html` element. Without explicit theme or motion attributes, CSS follows
`prefers-color-scheme` and `prefers-reduced-motion`. Explicit attributes take
precedence. Configure modes on the root: inherited CSS aliases do not rebind
automatically inside nested contexts.

The font tokens name Source Sans 3 and Source Code Pro, with generic fallbacks.
Consuming applications must load the fonts; this package does not bundle them.

## Validation

From the workspace root:

```sh
pnpm --filter @hommel/design-tokens check
```

The check reports all token parsing and loading diagnostics, then runs the
configured naming and contrast checks. Unusable tokens are skipped. A build
still writes CSS from the remaining tokens and exits with an error status when
it encountered errors. Spec deviations that remain usable and failed policy
checks are warnings. Configure optional checks in `tokens.config.ts`. Change
roles in semantics; change raw values in primitives. Keep names stable across
modes.
