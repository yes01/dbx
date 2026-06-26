import { strict as assert } from "node:assert";
import { test } from "vitest";

const syncChangelog = await import("../../.github/scripts/sync-changelog.mjs");

test("translateToEnglish reuses cached release translations when source hash is unchanged", async () => {
  const cnJson = syncChangelog.buildReleasesJson(
    [
      {
        tag_name: "v1.1.0",
        name: "DBX v1.1.0",
        published_at: "2026-05-18T00:00:00Z",
        body: "### \u65b0\u529f\u80fd\n- **\u65b0\u589e\u5bfc\u51fa** \u2014 \u652f\u6301\u5bfc\u51fa\u8868\u6570\u636e",
        draft: false,
        prerelease: false,
      },
      {
        tag_name: "v1.0.0",
        name: "DBX v1.0.0",
        published_at: "2026-05-17T00:00:00Z",
        body: "### \u4fee\u590d\n- **\u4fee\u590d\u8fde\u63a5** \u2014 \u907f\u514d\u91cd\u590d\u8fde\u63a5",
        draft: false,
        prerelease: false,
      },
    ],
    new Date("2026-05-18T01:00:00Z"),
  );
  const cachedRelease = {
    ...cnJson.releases[1],
    sections: [{ type: "fixed", title: "Fixed", items: [{ title: "Connection fix", desc: "Avoid duplicate connects" }] }],
  };
  const cachedEnJson = {
    updatedAt: "2026-05-17T01:00:00.000Z",
    releases: [cachedRelease],
  };
  let translationCalls = 0;

  const enJson = await syncChangelog.translateToEnglish(cnJson, {
    cachedEnJson,
    deepseekApiKey: "test-key",
    fetchImpl: async () => {
      translationCalls++;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "### Added\n- **Export added** \u2014 Supports table data export" } }],
        }),
      };
    },
    sleep: async () => {},
  });

  assert.equal(translationCalls, 1);
  assert.deepEqual(enJson.releases[1], cachedRelease);
  assert.equal(enJson.releases[0].sections[0].title, "Added");
  assert.equal(enJson.releases[0]._sourceHash, cnJson.releases[0]._sourceHash);
});
