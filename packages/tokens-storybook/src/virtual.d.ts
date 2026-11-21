declare module "virtual:@hommel/tokens-storybook/document" {
  import type { TokenResolverDocument } from "@hommel/tokens-generator";
  const doc: TokenResolverDocument;
  export default doc;
}

declare module "*.css" {
  const url: string;
  export default url;
}
