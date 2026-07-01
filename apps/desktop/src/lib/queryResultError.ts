import type { QueryResult } from "@/types/database";

export function isNoSnapshotErrorResult(result: QueryResult | undefined | null): boolean {
  if (!result?.columns?.includes("Error")) return false;
  const message = result.rows
    .flat()
    .map((value) => String(value ?? ""))
    .join("\n")
    .toLowerCase();
  return message.includes("snapshot") && (message.includes("not found") || message.includes("does not exist") || message.includes("expired"));
}
