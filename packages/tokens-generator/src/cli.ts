#!/usr/bin/env node
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { build } from "./build.ts";
import { TokenDocument } from "./load.ts";
import type { Config, DiagnosticSource, TokenDiagnostic } from "./types.ts";
import { checkDocument } from "./validate.ts";

const USAGE = `Usage: hommel-tokens-generator <command> [options]

Commands:
  build                generate configured output files
  check                validate tokens without writing output

Options:
  -c, --config <file>  config file (default: tokens.config.ts)
  -h, --help           show this help`;

function formatDiagnosticSource(source: DiagnosticSource) {
  const parts = [];
  if (source.token) {
    parts.push(`\t   at token ${source.token}`);
  }
  if (source.context) {
    parts.push(`\t   in ${source.context}`);
  }
  if (source.file) {
    parts.push(`\t   in file ${source.file}`);
  }
  if (parts.length === 0) return "";
  return parts.join("\n\t");
}

function formatDiagnostic(d: TokenDiagnostic) {
  const at = d.source ? d.source.map(formatDiagnosticSource).filter(Boolean).join(",\n") : "";
  return `${d.severity.toUpperCase()}: ${d.message}${at ? `\n${at}` : ""}`;
}

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
  checkDocument(document, config.validation);
  let hasErrors = false;
  let hasWarnings = false;
  for (const diagnostic of document.diagnostics) {
    const message = formatDiagnostic(diagnostic);
    if (diagnostic.severity === "error") {
      console.error(message);
      hasErrors = true;
    } else if (diagnostic.severity === "warning") {
      console.warn(message);
      hasWarnings = true;
    } else {
      console.info(message);
    }
  }

  if (hasErrors) {
    console.log("Token document has errors.");
    process.exitCode = 2;
  } else if (hasWarnings) {
    console.log("Token document has warnings.");
    process.exitCode = 1;
  } else {
    console.log("Token document is valid.");
  }

  if (command === "build" && !hasErrors) {
    const written = await build(config, document, path.dirname(configFile));
    console.log("Written files:");
    for (const file of written) console.log(`  ${path.relative(process.cwd(), file)}`);
  }
}

await main(process.argv.slice(2));
