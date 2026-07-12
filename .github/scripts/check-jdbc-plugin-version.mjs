#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const POM_PATH = "plugins/jdbc/pom.xml";
const MANIFEST_PATH = "plugins/jdbc/manifest.json";
const IGNORED_PLUGIN_FILES = new Set(["plugins/jdbc/README.md", "plugins/jdbc/package.sh", POM_PATH, MANIFEST_PATH]);

function firstProjectVersion(pomXml) {
  const match = pomXml.match(/<project[\s\S]*?<version>([^<]+)<\/version>/);
  return match?.[1]?.trim() ?? "";
}

function manifestVersion(manifestJson) {
  return JSON.parse(manifestJson).version ?? "";
}

function compareVersions(left, right) {
  const parse = (version) => version.split("-", 1)[0].split(".").map(Number);
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

export function evaluateJdbcPluginVersionChange({ changedFiles = [], basePomVersion, baseManifestVersion, headPomVersion, headManifestVersion }) {
  const errors = [];
  if (basePomVersion !== baseManifestVersion) {
    errors.push(`Base JDBC plugin version mismatch: pom.xml is ${basePomVersion} but manifest.json is ${baseManifestVersion}.`);
  }
  if (headPomVersion !== headManifestVersion) {
    errors.push(`JDBC plugin version mismatch: pom.xml is ${headPomVersion} but manifest.json is ${headManifestVersion}.`);
    return errors;
  }

  const runtimeChanged = changedFiles.some((path) => path.startsWith("plugins/jdbc/") && !path.startsWith("plugins/jdbc/dist/") && !path.startsWith("plugins/jdbc/target/") && !IGNORED_PLUGIN_FILES.has(path));
  if (runtimeChanged && compareVersions(headPomVersion, basePomVersion) <= 0) {
    errors.push(`JDBC plugin runtime changed but version did not increase (${basePomVersion} -> ${headPomVersion}). Bump pom.xml and manifest.json together.`);
  }
  return errors;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function readFileAt(ref, path) {
  return git(["show", `${ref}:${path}`]);
}

function main() {
  const [baseRef = "HEAD~1", headRef = "HEAD"] = process.argv.slice(2);
  const changedFiles = git(["diff", "--name-only", baseRef, headRef]).split("\n").filter(Boolean);
  const basePomVersion = firstProjectVersion(readFileAt(baseRef, POM_PATH));
  const baseManifestVersion = manifestVersion(readFileAt(baseRef, MANIFEST_PATH));
  const headPomVersion = firstProjectVersion(readFileAt(headRef, POM_PATH));
  const headManifestVersion = manifestVersion(readFileAt(headRef, MANIFEST_PATH));
  const errors = evaluateJdbcPluginVersionChange({
    changedFiles,
    basePomVersion,
    baseManifestVersion,
    headPomVersion,
    headManifestVersion,
  });

  if (errors.length) {
    for (const error of errors) {
      console.error(`::error::${error}`);
    }
    process.exit(1);
  }
  console.log(`JDBC plugin version check passed (${headPomVersion}).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
