#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const DEFAULT_VERSION = "0.6.0";
const rawVersion = (process.argv[2] || process.env.DBX_APP_VERSION || DEFAULT_VERSION).trim();
const version = rawVersion.startsWith("v") ? rawVersion.slice(1) : rawVersion;

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Invalid version: ${rawVersion}`);
  process.exit(1);
}

function updateJson(path, updater) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  updater(data);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function replace(path, pattern, replacement) {
  const next = readFileSync(path, "utf8").replace(pattern, replacement);
  writeFileSync(path, next);
}

updateJson("package.json", (pkg) => {
  pkg.version = version;
});

replace("src-tauri/tauri.conf.json", /^  "version": ".*",$/m, `  "version": "${version}",`);
replace("src-tauri/Cargo.toml", /^version = ".*"$/m, `version = "${version}"`);
replace("crates/dbx-web/Cargo.toml", /^version = ".*"$/m, `version = "${version}"`);

for (const packageName of ["dbx", "dbx-web"]) {
  replace(
    "Cargo.lock",
    new RegExp(`(name = "${packageName}"\\nversion = ")[^"]+(")`),
    `$1${version}$2`,
  );
}

console.log(`DBX app version set to ${version}`);
