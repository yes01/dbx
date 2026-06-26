import { spawn } from "node:child_process";
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const isWindows = process.platform === "win32";
const binPath = path.join(process.cwd(), "node_modules", ".bin");
const env = {
  ...process.env,
  PATH: `${binPath}${path.delimiter}${process.env.PATH ?? ""}`,
};

function taskProcess(task) {
  if (!isWindows) {
    return {
      command: task.command,
      args: task.args,
    };
  }

  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/c", "pnpm", "exec", task.command, ...task.args],
  };
}

const testRoots = [
  "packages/app-tests",
  "apps/desktop/src",
  "packages/node-core/tests",
  "docs/lib",
];

function walkFiles(dir) {
  try {
    if (!statSync(dir).isDirectory()) return [];
  } catch {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (/\.(test|spec)\.ts$/.test(entry.name)) {
      files.push(entryPath.replaceAll(path.sep, "/"));
    }
  }
  return files;
}

function testFilesUsing(importSource) {
  const matcher = new RegExp(`from ['"]${importSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`);
  return testRoots.flatMap(walkFiles).filter((file) => matcher.test(readFileSync(file, "utf8")));
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const nodeTestFiles = testFilesUsing("node:test");
const vitestFiles = testFilesUsing("vitest").filter((file) => !nodeTestFiles.includes(file));
const vitestRunCheckConfigPath = path.join(process.cwd(), ".vitest.run-check.config.mjs");

if (vitestFiles.length > 0) {
  writeFileSync(
    vitestRunCheckConfigPath,
    [
      'import path from "node:path";',
      'import { defineConfig } from "vitest/config";',
      "",
      "export default defineConfig({",
      "  resolve: {",
      '    alias: { "@": path.resolve(process.cwd(), "apps/desktop/src") },',
      "  },",
      "  test: {",
      `    include: ${JSON.stringify(vitestFiles)},`,
      "  },",
      "});",
      "",
    ].join("\n"),
  );
}

const tasks = [
  {
    name: "format",
    command: "oxfmt",
    args: ["--check", "apps/desktop/src/**/*.{ts,vue}"],
  },
  {
    name: "lint",
    command: "oxlint",
    args: ["--vue-plugin", "apps/desktop/src"],
  },
  {
    name: "typecheck",
    command: "vue-tsc",
    args: ["--noEmit", "--project", "apps/desktop/tsconfig.json"],
  },
  vitestFiles.length > 0 && {
    name: "test",
    command: "vitest",
    args: ["run", "--config", vitestRunCheckConfigPath],
  },
  {
    name: "cli-test",
    command: "pnpm",
    args: ["--filter", "@dbx-app/cli", "test"],
  },
  {
    name: "mcp-test",
    command: "pnpm",
    args: ["--filter", "@dbx-app/mcp-server", "test"],
  },
  ...chunk(nodeTestFiles, 12).map((files, index) => ({
    name: nodeTestFiles.length > 12 ? `node-test-${index + 1}` : "node-test",
    command: "tsx",
    args: ["--tsconfig", "apps/desktop/tsconfig.json", "--test", ...files],
  })),
].filter(Boolean);

function runTask(task) {
  const startedAt = performance.now();
  const processConfig = taskProcess(task);
  const child = spawn(processConfig.command, processConfig.args, {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];

  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));

  return new Promise((resolve) => {
    child.on("error", (error) => {
      resolve({
        ...task,
        code: 1,
        durationMs: performance.now() - startedAt,
        output: "",
        errorOutput: error.stack ?? String(error),
      });
    });

    child.on("close", (code) => {
      resolve({
        ...task,
        code,
        durationMs: performance.now() - startedAt,
        output: Buffer.concat(stdout).toString(),
        errorOutput: Buffer.concat(stderr).toString(),
      });
    });
  });
}

function outputFailureExcerpt(output) {
  const lines = output.trimEnd().split(/\r?\n/);
  const selected = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    if (!/\bnot ok\b|AssertionError|ERR_ASSERT|^# fail\b|^# tests\b|^# pass\b/.test(lines[index])) continue;
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 14);
    for (let lineIndex = start; lineIndex < end; lineIndex += 1) {
      selected.add(lineIndex);
    }
  }

  if (selected.size === 0) return "";

  const excerpt = [];
  let previous = -2;
  for (const index of [...selected].sort((a, b) => a - b)) {
    if (index > previous + 1 && excerpt.length > 0) excerpt.push("...");
    excerpt.push(lines[index]);
    previous = index;
  }
  return excerpt.join("\n");
}

function tailOutput(output, maxLines = 120) {
  const lines = output.trimEnd().split(/\r?\n/);
  if (lines.length <= maxLines) return lines.join("\n");
  return [`... omitted ${lines.length - maxLines} earlier line(s) ...`, ...lines.slice(-maxLines)].join("\n");
}

let failures = [];

try {
  const results = await Promise.all(tasks.map(runTask));

  for (const result of results) {
    const seconds = (result.durationMs / 1000).toFixed(2);
    const status = result.code === 0 ? "ok" : "failed";
    console.log(`${status.padEnd(6)} ${result.name.padEnd(9)} ${seconds}s`);
  }

  failures = results.filter((result) => result.code !== 0);

  for (const failure of failures) {
    console.error(`\n${failure.name} output:`);
    if (failure.output) {
      const excerpt = outputFailureExcerpt(failure.output);
      if (excerpt) {
        console.error("failure excerpt:");
        console.error(excerpt);
        console.error("\noutput tail:");
      }
      console.error(tailOutput(failure.output));
    }
    if (failure.errorOutput) {
      console.error(tailOutput(failure.errorOutput));
    }
  }
} finally {
  if (vitestFiles.length > 0) {
    try {
      unlinkSync(vitestRunCheckConfigPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

if (failures.length > 0) {
  process.exit(1);
}
