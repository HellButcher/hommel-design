import {
  DocsContainer as BaseDocsContainer,
  type DocsContainerProps,
} from "@storybook/addon-docs/blocks";
import * as React from "react";

import { TokensProvider } from "./blocks.tsx";
import { TokensThemeBridge } from "./theme-vars.ts";

/**
 * replaces addon-docs' default `DocsContainer`, so the whole docs/mdx page (not just the
 * individual stories rendered within it) is wrapped with the `TokensProvider` and themed
 * `--tb-*` custom properties. Register via `parameters.docs.container` in `preview.ts`.
 */
export function TokensDocsContainer({
  children,
  ...props
}: React.PropsWithChildren<DocsContainerProps>) {
  return (
    <BaseDocsContainer {...props}>
      <TokensThemeBridge>
        <TokensProvider>{children}</TokensProvider>
      </TokensThemeBridge>
    </BaseDocsContainer>
  );
}
