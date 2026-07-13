import { describe, expect, it } from "vitest";

import type { QueryResult } from "@/types/database";
import { isMysqlExecutionErrorResult, usesMysqlProtocolDatabaseType } from "@/lib/queryResultError";

function errorResult(message: string): QueryResult {
  return { columns: ["Error"], rows: [[message]], affected_rows: 0, execution_time_ms: 0 };
}

describe("MySQL execution error results", () => {
  it("recognizes explicitly marked native MySQL errors", () => {
    expect(isMysqlExecutionErrorResult({ ...errorResult("duplicate"), execution_error: true }, "mysql")).toBe(true);
    expect(usesMysqlProtocolDatabaseType("doris")).toBe(true);
  });

  it("does not mistake a successful Error alias or JDBC result for an execution error", () => {
    expect(isMysqlExecutionErrorResult(errorResult("2"), "mysql")).toBe(false);
    expect(isMysqlExecutionErrorResult({ ...errorResult("duplicate"), execution_error: true }, "jdbc")).toBe(false);
  });
});
