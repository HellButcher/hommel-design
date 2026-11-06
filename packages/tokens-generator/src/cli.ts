#!/usr/bin/env node
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { build } from "./build.ts";
import type { Config } from "./types.ts";

const USAGE = `Usage: hommel-tokens [options]

Options:
  -c, --config <file>  config file (default: tokens.config.ts)
  -h, --help           show this help`;

try {
  const { values } = parseArgs({
    options: {
      config: { type: "string", short: "c", default: "tokens.config.ts" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const configFile = path.resolve(values.config);
  const { default: config } = (await import(pathToFileURL(configFile).href)) as {
    default: Config;
  };
  const written = await build(config, path.dirname(configFile));
  for (const file of written) {
    console.log(`  ${path.relative(process.cwd(), file)}`);
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
