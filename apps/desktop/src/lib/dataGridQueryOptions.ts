import { queryTimeoutSecsForConnection } from "@/lib/queryTimeout";
import type { ConnectionConfig } from "@/types/database";

export function dataGridCountQueryOptions(connection?: Pick<ConnectionConfig, "query_timeout_secs"> | null): {
  maxRows: number;
  timeoutSecs: number;
} {
  return {
    maxRows: 1,
    timeoutSecs: queryTimeoutSecsForConnection(connection),
  };
}
