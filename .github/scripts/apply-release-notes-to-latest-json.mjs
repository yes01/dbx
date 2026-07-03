#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

export function applyReleaseNotesToLatestJson({ latestJson, releaseNotes }) {
  const data = JSON.parse(latestJson);
  const notes = releaseNotes.trim();
  if (notes) {
    data.notes = releaseNotes;
  } else {
    delete data.notes;
  }
  return `${JSON.stringify(data, null, 2)}\n`;
}

function main() {
  const [latestJsonPath, releaseNotesPath] = process.argv.slice(2);
  if (!latestJsonPath || !releaseNotesPath) {
    console.error("Usage: apply-release-notes-to-latest-json.mjs <latest.json> <release-notes.md>");
    process.exit(1);
  }

  const updated = applyReleaseNotesToLatestJson({
    latestJson: readFileSync(latestJsonPath, "utf8"),
    releaseNotes: readFileSync(releaseNotesPath, "utf8"),
  });
  writeFileSync(latestJsonPath, updated);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
