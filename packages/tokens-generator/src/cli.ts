#!/usr/bin/env node
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { build } from "./build.ts";
import { TokenDocument } from "./load.ts";
import type { Config } from "./types.ts";
import { validateDocument } from "./validate.ts";

const USAGE = `Usage: hommel-tokens-generator <command> [options]

Commands:
  build                generate configured output files
  check                validate tokens without writing output

Options:
  -c, --config <file>  config file (default: tokens.config.ts)
  -h, --help           show this help`;

async function main(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      config: { type: "string", short: "c", default: "tokens.config.ts" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const [command, ...extra] = positionals;
  if (!command || extra.length > 0 || !["build", "check"].includes(command)) {
    console.error(`Invalid command "${command}"`);
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }

  const configFile = path.resolve(values.config);
  const { default: config } = (await import(pathToFileURL(configFile).href)) as {
    default: Config;
  };
  const document = await TokenDocument.load(
    path.resolve(path.dirname(configFile), config.resolver),
  );
  const diagnostics = validateDocument(document, config.validation);
  for (const diagnostic of diagnostics) {
    const location = [diagnostic.where, diagnostic.token].filter(Boolean).join(" ");
    const message = `${diagnostic.severity.toUpperCase()}${location ? ` ${location}:` : ":"} ${diagnostic.message}`;
    if (diagnostic.severity === "error") console.error(message);
    else console.warn(message);
  }
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (command === "check") {
    if (!hasErrors) console.log("Token document is valid.");
    process.exitCode = hasErrors ? 1 : 0;
  } else {
    const written = await build(config, document, path.dirname(configFile));
    for (const file of written) console.log(`  ${path.relative(process.cwd(), file)}`);
    process.exitCode = hasErrors ? 1 : 0;
  }
}

await main(process.argv.slice(2));
