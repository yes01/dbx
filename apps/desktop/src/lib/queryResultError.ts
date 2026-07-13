import type { DatabaseType, QueryResult } from "@/types/database";

const MYSQL_PROTOCOL_DATABASE_TYPES = new Set<DatabaseType>(["mysql", "doris", "starrocks", "manticoresearch"]);

export function usesMysqlProtocolDatabaseType(databaseType: DatabaseType | undefined): boolean {
  return databaseType !== undefined && MYSQL_PROTOCOL_DATABASE_TYPES.has(databaseType);
}

export function isMysqlExecutionErrorResult(result: QueryResult, databaseType: DatabaseType | undefined): boolean {
  return usesMysqlProtocolDatabaseType(databaseType) && result.execution_error === true;
}

export function isNoSnapshotErrorResult(result: QueryResult | undefined | null): boolean {
  if (!result?.columns?.includes("Error")) return false;
  const message = result.rows
    .flat()
    .map((value) => String(value ?? ""))
    .join("\n")
    .toLowerCase();
  return message.includes("snapshot") && (message.includes("not found") || message.includes("does not exist") || message.includes("expired"));
}
