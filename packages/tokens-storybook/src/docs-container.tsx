import * as React from "react";
import { DocsContainer as BaseDocsContainer, type DocsContainerProps } from "@storybook/addon-docs/blocks";
import { TokensThemeBridge } from "./theme-vars.ts";
import { TokensProvider } from "./blocks.tsx";



/**
 * replaces addon-docs' default `DocsContainer`, so the whole docs/mdx page (not just the
 * individual stories rendered within it) is wrapped with the `TokensProvider` and themed
 * `--tb-*` custom properties. Register via `parameters.docs.container` in `preview.ts`.
 */
export function TokensDocsContainer({ children, ...props }: React.PropsWithChildren<DocsContainerProps>) {
  return (
    <BaseDocsContainer {...props}>
      <TokensThemeBridge>
        <TokensProvider>{children}</TokensProvider>
      </TokensThemeBridge>
    </BaseDocsContainer>
  );
}
