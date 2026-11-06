import * as fs from "node:fs/promises";
import * as path from "node:path";

import { loadDocument } from "./load.ts";
import type { Config } from "./types.ts";

export function defineConfig(config: Config): Config {
  return config;
}

/** loads the resolver document, runs all plugins and writes their output files; returns the written paths */
export async function build(config: Config, baseDir: string = process.cwd()): Promise<string[]> {
  const documentPath = path.resolve(baseDir, config.resolver);
  const document = await loadDocument(documentPath);
  const outDir = path.resolve(baseDir, config.outDir ?? "dist");
  const written: string[] = [];
  for (const plugin of config.plugins) {
    const files = new Map<string, string>();
    await plugin.build({
      document,
      outputFile(filename, contents) {
        const target = path.resolve(outDir, filename);
        if (!target.startsWith(outDir + path.sep)) {
          throw new Error(`[${plugin.name}] output file "${filename}" is outside of ${outDir}`);
        }
        files.set(target, contents);
      },
    });
    for (const [target, contents] of files) {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, contents);
      written.push(target);
    }
  }
  return written;
}
