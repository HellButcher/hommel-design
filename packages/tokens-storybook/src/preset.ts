import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { DEFAULT_CONFIG_FILE, loadTokenDocument } from "@hommel/tokens-generator";
import type { TokensConfig, TokensOptions } from "./types.ts";
import type { InlineConfig } from "vite";
import { RESOLVED_VIRTUAL_MODULE_ID, VIRTUAL_MODULE_ID } from "./constants.ts";
  
/** Vite plugin serving the loaded+resolved `TokenDocument` (as JSON) to the preview/manager bundles */
function tokensDocumentPlugin(config: TokensConfig & { configDir: string }) {
  const resolverPath = resolve(config.configDir, config.resolver);
  return {
    name: "@hommel/tokens-storybook/document",
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
      return undefined;
    },
    async load(id: string) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined;
      const doc = await loadTokenDocument(resolverPath);
      return `export default ${JSON.stringify(doc.toJSON())};\n`;
    },
  };
}

async function resolveConfig(options: TokensOptions & { configDir: string }): Promise<TokensConfig & { configDir: string }> {
  let configPath;
  if (options.config === undefined) {
    configPath = resolve(options.configDir, "..", DEFAULT_CONFIG_FILE);
  } else if (typeof options.config === 'string') {
    configPath = resolve(options.configDir, options.config);
  } else if(typeof options.config === 'object' && !Array.isArray(options.config)) {
    return { configDir: options.configDir, ...options.config };
  } else {
    throw new Error('config must be a path or a configuration object');
  }
  const { default: config } = (await import(pathToFileURL(configPath).href)) as {
    default: TokensConfig;
  };
  return { configDir: dirname(configPath), ...config };
}

function validateConfig(config: TokensConfig) {
  if (!config.resolver) {
    throw new Error('@hommel/tokens-storybook: missing required "resolver" addon option');
  }
}

/** options are merged in by Storybook from the addon's `{ name, options }` config entry */
export async function viteFinal(
  viteConfig: InlineConfig,
  options: TokensOptions & { configDir: string },
) {
  const config = await resolveConfig(options);
  validateConfig(config);
  viteConfig.plugins ??= [];
  viteConfig.plugins.push(tokensDocumentPlugin(config));
  return viteConfig;
}
