import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const ports = [1420, 5173];

function commandExists(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
  return result.status === 0;
}

function killPort(port) {
  if (!commandExists("lsof")) return;
  const result = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) return;

  const pids = [...new Set(result.stdout.split(/\s+/).filter(Boolean))];
  for (const pid of pids) {
    spawnSync("kill", ["-TERM", pid], { stdio: "ignore" });
  }
  console.log(`Freed port ${port}: ${pids.join(", ")}`);
}

for (const port of ports) {
  killPort(port);
}

const child = spawn("pnpm", ["tauri", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    RUST_LOG: process.env.RUST_LOG || "info",
  },
});

function forward(signal) {
  child.kill(signal);
}

process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
