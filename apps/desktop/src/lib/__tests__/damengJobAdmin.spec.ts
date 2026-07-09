import { describe, expect, it } from "vitest";
import { damengCreateJobSql, damengRunJobSql, parseDamengJobEnvironmentReady, parseDamengJobs } from "@/lib/damengJobAdmin";
import type { QueryResult } from "@/types/database";

function result(columns: string[], rows: QueryResult["rows"]): QueryResult {
  return {
    columns,
    column_types: [],
    column_sortables: [],
    rows,
    affected_rows: 0,
    execution_time_ms: 0,
    truncated: false,
    session_id: null,
    has_more: false,
  };
}

describe("damengJobAdmin", () => {
  it("parses job rows from Dameng query results", () => {
    const jobs = parseDamengJobs(result(["ID", "NAME", "ENABLE", "USERNAME", "RUNNING", "RUNNING_SID", "DESCRIBE"], [[12, "JOB_A", 1, "SYSDBA", 1, 99, "nightly"]]));

    expect(jobs).toEqual([
      expect.objectContaining({
        id: "12",
        name: "JOB_A",
        enabled: true,
        running: true,
        runningSid: "99",
        owner: "SYSDBA",
        description: "nightly",
      }),
    ]);
  });

  it("builds create job SQL with escaped string values", () => {
    const sql = damengCreateJobSql({
      name: "JOB_A",
      enabled: true,
      description: "owner's job",
      stepName: "STEP1",
      command: "SELECT 'x';",
      scheduleName: "SCHED1",
      scheduleMode: "daily",
      startDate: "CURDATE",
      startTime: "01:00:00",
      minuteInterval: 15,
    });

    expect(sql).toContain("SP_CREATE_JOB('JOB_A', 1");
    expect(sql).toContain("'owner''s job'");
    expect(sql).toContain("SP_ADD_JOB_STEP('JOB_A', 'STEP1', 0, 'SELECT ''x'';'");
    expect(sql).toContain("SP_ADD_JOB_SCHEDULE('JOB_A', 'SCHED1', 1, 1, 1, 0, 15");
  });

  it("guards invalid run job ids", () => {
    expect(damengRunJobSql("7")).toBe("SP_DBMS_JOB_RUN_ASYNC(7);");
    expect(damengRunJobSql("abc")).toBe("");
  });

  it("detects initialized job environment", () => {
    expect(parseDamengJobEnvironmentReady(result(["CNT"], [[1]]))).toBe(true);
    expect(parseDamengJobEnvironmentReady(result(["CNT"], [[0]]))).toBe(false);
  });
});
