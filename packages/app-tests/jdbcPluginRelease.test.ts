import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateJdbcPluginReleaseBump } from "../../.github/scripts/bump-jdbc-plugin-version.mjs";
import { evaluateJdbcPluginVersionChange } from "../../.github/scripts/check-jdbc-plugin-version.mjs";
import { augmentLatestJsonWithJdbcPlugin } from "../../.github/scripts/augment-latest-json-jdbc-plugin.mjs";

test("requires a JDBC plugin version bump when runtime files change", () => {
  assert.deepEqual(
    evaluateJdbcPluginVersionChange({
      changedFiles: ["plugins/jdbc/src/main/java/app/dbx/jdbc/DbxJdbcPlugin.java"],
      basePomVersion: "0.1.1",
      baseManifestVersion: "0.1.1",
      headPomVersion: "0.1.1",
      headManifestVersion: "0.1.1",
    }),
    ["JDBC plugin runtime changed but version did not increase (0.1.1 -> 0.1.1). Bump pom.xml and manifest.json together."],
  );
});

test("rejects a JDBC plugin version decrease when runtime files change", () => {
  assert.deepEqual(
    evaluateJdbcPluginVersionChange({
      changedFiles: ["plugins/jdbc/src/main/java/app/dbx/jdbc/DbxJdbcPlugin.java"],
      basePomVersion: "0.1.2",
      baseManifestVersion: "0.1.2",
      headPomVersion: "0.1.1",
      headManifestVersion: "0.1.1",
    }),
    ["JDBC plugin runtime changed but version did not increase (0.1.2 -> 0.1.1). Bump pom.xml and manifest.json together."],
  );
});

test("allows JDBC plugin runtime changes when pom and manifest versions are bumped together", () => {
  assert.deepEqual(
    evaluateJdbcPluginVersionChange({
      changedFiles: ["plugins/jdbc/src/main/java/app/dbx/jdbc/DbxJdbcPlugin.java"],
      basePomVersion: "0.1.1",
      baseManifestVersion: "0.1.1",
      headPomVersion: "0.1.2",
      headManifestVersion: "0.1.2",
    }),
    [],
  );
});

test("does not require a JDBC plugin version bump for docs or release packaging changes", () => {
  assert.deepEqual(
    evaluateJdbcPluginVersionChange({
      changedFiles: ["plugins/jdbc/README.md", "plugins/jdbc/package.sh"],
      basePomVersion: "0.1.1",
      baseManifestVersion: "0.1.1",
      headPomVersion: "0.1.1",
      headManifestVersion: "0.1.1",
    }),
    [],
  );
});

test("requires JDBC plugin pom and manifest versions to match", () => {
  assert.deepEqual(
    evaluateJdbcPluginVersionChange({
      changedFiles: ["plugins/jdbc/manifest.json"],
      basePomVersion: "0.1.1",
      baseManifestVersion: "0.1.1",
      headPomVersion: "0.1.2",
      headManifestVersion: "0.1.1",
    }),
    ["JDBC plugin version mismatch: pom.xml is 0.1.2 but manifest.json is 0.1.1."],
  );
});

test("auto bumps JDBC plugin patch version when runtime files changed for release", () => {
  const result = evaluateJdbcPluginReleaseBump({
    changedFiles: ["plugins/jdbc/src/main/java/app/dbx/jdbc/DbxJdbcPlugin.java"],
    pomXml: "<project><version>0.1.9</version></project>",
    manifestJson: '{ "version": "0.1.9" }',
  });

  assert.equal(result.changed, true);
  assert.equal(result.oldVersion, "0.1.9");
  assert.equal(result.newVersion, "0.1.10");
  assert.match(result.pomXml, /<version>0\.1\.10<\/version>/);
  assert.match(result.manifestJson, /"version": "0\.1\.10"/);
});

test("auto bumps JDBC plugin again when release range still contains runtime file changes", () => {
  const result = evaluateJdbcPluginReleaseBump({
    changedFiles: ["plugins/jdbc/src/main/java/app/dbx/jdbc/DbxJdbcPlugin.java", "plugins/jdbc/pom.xml", "plugins/jdbc/manifest.json"],
    pomXml: "<project><version>0.1.10</version></project>",
    manifestJson: '{ "version": "0.1.10" }',
  });

  assert.equal(result.changed, true);
  assert.equal(result.oldVersion, "0.1.10");
  assert.equal(result.newVersion, "0.1.11");
});

test("does not auto bump JDBC plugin version for release packaging-only changes", () => {
  const result = evaluateJdbcPluginReleaseBump({
    changedFiles: ["plugins/jdbc/README.md", "plugins/jdbc/package.sh"],
    pomXml: "<project><version>0.1.9</version></project>",
    manifestJson: '{ "version": "0.1.9" }',
  });

  assert.equal(result.changed, false);
  assert.equal(result.oldVersion, "0.1.9");
  assert.equal(result.newVersion, "0.1.9");
});

test("auto bump refuses mismatched JDBC plugin source versions", () => {
  assert.throws(
    () =>
      evaluateJdbcPluginReleaseBump({
        changedFiles: ["plugins/jdbc/src/main/java/app/dbx/jdbc/DbxJdbcPlugin.java"],
        pomXml: "<project><version>0.1.9</version></project>",
        manifestJson: '{ "version": "0.1.8" }',
      }),
    /JDBC plugin version mismatch/,
  );
});

test("adds JDBC plugin metadata to latest.json without disturbing updater fields", () => {
  const result = augmentLatestJsonWithJdbcPlugin({
    latestJson: JSON.stringify({
      version: "0.5.12",
      notes: "Release notes",
      platforms: {
        "darwin-aarch64": {
          signature: "sig",
          url: "https://example.com/app.dmg",
        },
      },
    }),
    jdbcVersion: "0.1.3",
    protocolVersion: 1,
    url: "https://github.com/t8y2/dbx/releases/download/v0.5.12/dbx-jdbc-plugin-0.1.3.zip",
  });
  const parsed = JSON.parse(result);

  assert.equal(parsed.version, "0.5.12");
  assert.equal(parsed.platforms["darwin-aarch64"].signature, "sig");
  assert.deepEqual(parsed.jdbc_plugin, {
    version: "0.1.3",
    protocol_version: 1,
    url: "https://github.com/t8y2/dbx/releases/download/v0.5.12/dbx-jdbc-plugin-0.1.3.zip",
  });
});

test("keeps releases draft until required assets are finalized and treats R2 as optional", () => {
  const workflow = readFileSync(".github/workflows/release.yml", "utf8");

  assert.match(workflow, /for workflow in ci\.yml desktop-build\.yml/);
  assert.match(workflow, /INPUT_PRERELEASE: \$\{\{ github\.event\.inputs\.prerelease \}\}/);
  assert.match(workflow, /releaseDraft: true/);
  assert.match(workflow, /R2 release secrets are not fully configured; skipping optional JDBC mirror sync\./);
  assert.doesNotMatch(workflow, /R2 release secrets are required/);
  assert.match(workflow, /VERSIONED_KEY="releases\/jdbc\/\$\{JDBC_VERSION\}/);
  assert.match(workflow, /verify_mirror "https:\/\/dl\.dbxio\.com\/\$\{VERSIONED_KEY\}"/);
  assert.match(workflow, /gh release upload "\$TAG" "\$WORK_DIR\/latest\.json"/);
  assert.match(workflow, /--draft=false/);
});
