import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

const TEMPLATE = {
  license: "MIT",
  author: {
    name: "Christoph Hommelsheim",
    url: "https://hommel.dev",
  },
  repository: {
    type: "git",
    url: "git+https://github.com/HellButcher/hommel-design",
  },
};

const STANDARD_FIELD_ORDER = [
  "name",
  "version",
  "private",
  "license",
  "description",
  "homepage",
  "bugs",
  "funding",
  "repository",
  "author",
  "contributors",
  "keywords",
  "type",
  "main",
  "module",
  "types",
  "exports",
  "files",
  "scripts",
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "engines",
  "packageManager",
];

function processPackageJson<J extends Record<string, unknown>>(packageJson: J): J {
  const ordered: J = {};

  // first all fields by STANDARD_FIELD_ORDER
  for (const field of STANDARD_FIELD_ORDER) {
    if (field in TEMPLATE) {
      ordered[field] = TEMPLATE[field];
    } else {
      ordered[field] = packageJson[field];
    }
  }

  // then all remaining fields
  for (const field in packageJson) {
    if (!(field in ordered)) {
      ordered[field] = packageJson[field];
    }
  }

  return ordered;
}

// process package.json
const PACKAGE_JSON_PATH = "./package.json";
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));

console.log(`Processing ${packageJson.name || path.dirname(process.cwd())}...`);

const processedJson = processPackageJson(packageJson);

fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(processedJson, null, 2) + "\n");

// copy LICENSE.md
const SOURCE_LICENSE_PATH = path.resolve(path.dirname(import.meta.dirname), "./LICENSE.md");
const DEST_LICENSE_PATH = path.resolve("LICENSE.md");

if (SOURCE_LICENSE_PATH !== DEST_LICENSE_PATH) {
  fs.copyFileSync(SOURCE_LICENSE_PATH, DEST_LICENSE_PATH);
}
