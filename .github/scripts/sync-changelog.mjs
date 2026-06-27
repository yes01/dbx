#!/usr/bin/env node

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "yes01/dbx";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const OUT_CN = "releases-cn.json";
const OUT_EN = "releases-en.json";
const EN_CACHE_URL = process.env.CHANGELOG_EN_CACHE_URL || "https://dl.dbxio.com/changelog/releases-en.json";

const SECTION_MAP = {
  "\u65b0\u529f\u80fd": "added",
  Added: "added",
  "\u6539\u8fdb": "improved",
  Improved: "improved",
  "\u4fee\u590d": "fixed",
  Fixed: "fixed",
  "\u53d8\u66f4": "changed",
  Changed: "changed",
  "\u79fb\u9664": "removed",
  Removed: "removed",
};

export async function fetchAllReleases() {
  const releases = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.length === 0) break;
    releases.push(...data);
    page++;
  }
  return releases;
}

export function stripDownloadSection(body) {
  const markers = ["### \u4e0b\u8f7d\u5b89\u88c5", "### Download", "### \u7cfb\u7edf\u8981\u6c42", "### System Requirements"];
  let idx = body.length;
  for (const marker of markers) {
    const index = body.indexOf(marker);
    if (index !== -1 && index < idx) idx = index;
  }
  return body.slice(0, idx).trim();
}

export function parseBody(body) {
  const cleaned = stripDownloadSection(body);
  const sections = [];
  let current = null;

  for (const line of cleaned.split("\n")) {
    const headerMatch = line.match(/^###\s+(.+)/);
    if (headerMatch) {
      const title = headerMatch[1].trim();
      const type = SECTION_MAP[title] || "other";
      current = { type, title, items: [] };
      sections.push(current);
      continue;
    }

    if (!current) continue;

    const itemMatch = line.match(/^-\s+\*\*(.+?)\*\*\s*(?:-|\u2013|\u2014)\s*(.+)/);
    if (itemMatch) {
      current.items.push({ title: itemMatch[1].trim(), desc: itemMatch[2].trim() });
      continue;
    }

    const plainMatch = line.match(/^-\s+(.+)/);
    if (plainMatch) {
      current.items.push({ title: plainMatch[1].trim(), desc: "" });
    }
  }

  return sections.filter((section) => section.items.length > 0);
}

export function buildReleaseSourceHash(release) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        tag: release.tag_name,
        name: release.name || release.tag_name,
        publishedAt: release.published_at || "",
        body: release.body || "",
      }),
    )
    .digest("hex");
}

export function buildReleasesJson(releases, now = new Date()) {
  return {
    updatedAt: now.toISOString(),
    releases: releases
      .filter((release) => !release.draft && !release.prerelease)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .map((release) => ({
        tag: release.tag_name,
        name: release.name || release.tag_name,
        date: release.published_at.slice(0, 10),
        _sourceHash: buildReleaseSourceHash(release),
        sections: parseBody(release.body || ""),
      })),
  };
}

function releaseToMarkdown(release) {
  return release.sections
    .map((section) => {
      const items = section.items.map((item) => (item.desc ? `- **${item.title}** \u2014 ${item.desc}` : `- ${item.title}`)).join("\n");
      return `### ${section.title}\n${items}`;
    })
    .join("\n\n");
}

export async function fetchCachedEnglish({
  cacheUrl = EN_CACHE_URL,
  fetchImpl = fetch,
} = {}) {
  try {
    const res = await fetchImpl(cacheUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`English changelog cache unavailable: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.warn(`English changelog cache unavailable: ${error.message}`);
    return null;
  }
}

export async function translateToEnglish(
  cnJson,
  {
    cachedEnJson = null,
    deepseekApiKey = DEEPSEEK_API_KEY,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms)),
  } = {},
) {
  if (!deepseekApiKey) {
    console.warn("DEEPSEEK_API_KEY not set, skipping translation");
    return null;
  }

  const cachedByTag = new Map((cachedEnJson?.releases || []).map((release) => [release.tag, release]));
  const enReleases = [];
  let reusedCount = 0;
  let translatedCount = 0;

  for (const release of cnJson.releases) {
    const cachedRelease = cachedByTag.get(release.tag);
    if (cachedRelease?._sourceHash === release._sourceHash) {
      enReleases.push({
        ...cachedRelease,
        name: release.name,
        date: release.date,
        _sourceHash: release._sourceHash,
      });
      reusedCount++;
      continue;
    }

    const sectionsText = releaseToMarkdown(release);
    if (!sectionsText.trim()) {
      enReleases.push({ ...release, sections: [] });
      continue;
    }

    const res = await fetchImpl("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekApiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a technical translator. Translate the following Chinese software changelog to English. Keep the exact markdown format (### headers, - bullet points, **bold** titles, em dashes). Only translate, do not add or remove content. Keep technical terms, product names, and contributor names unchanged.",
          },
          { role: "user", content: sectionsText },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error(`DeepSeek API error for ${release.tag}: ${res.status}`);
      enReleases.push(release);
      continue;
    }

    const data = await res.json();
    const translated = data.choices?.[0]?.message?.content || "";
    const enSections = parseBody(translated);
    enReleases.push({ ...release, sections: enSections.length > 0 ? enSections : release.sections });
    translatedCount++;

    await sleep(200);
  }

  console.log(`English changelog cache reused ${reusedCount} release(s), translated ${translatedCount} release(s)`);
  return { updatedAt: cnJson.updatedAt, releases: enReleases };
}

async function main() {
  console.log("Fetching releases from GitHub...");
  const releases = await fetchAllReleases();
  console.log(`Found ${releases.length} releases`);

  const cnJson = buildReleasesJson(releases);
  console.log(`Processed ${cnJson.releases.length} non-draft releases`);

  writeFileSync(OUT_CN, JSON.stringify(cnJson, null, 2));
  console.log(`Wrote ${OUT_CN}`);

  console.log("Fetching cached English changelog...");
  const cachedEnJson = await fetchCachedEnglish();

  console.log("Translating to English...");
  const enJson = await translateToEnglish(cnJson, { cachedEnJson });
  if (enJson) {
    writeFileSync(OUT_EN, JSON.stringify(enJson, null, 2));
    console.log(`Wrote ${OUT_EN}`);
  }

  console.log("Done!");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
