import { Text } from "@codemirror/state";
import { describe, expect, it, vi } from "vitest";
import { executableStatementRangeAtCursor, executableStatementRangeCacheForDoc, executableStatementRangeStartingAt, type ExecutableStatementRangeParser } from "@/lib/executableStatementRangeCache";

describe("executableStatementRangeCacheForDoc", () => {
  it("reuses parsed executable statement ranges for the same document and database type", () => {
    const doc = Text.of(["SELECT 1;", "SELECT 2;"]);
    const parse = vi.fn<ExecutableStatementRangeParser>(() => [
      { from: 0, to: 8, sql: "SELECT 1" },
      { from: 10, to: 18, sql: "SELECT 2" },
    ]);

    const first = executableStatementRangeCacheForDoc(null, doc, "mysql", parse);
    const second = executableStatementRangeCacheForDoc(first, doc, "mysql", parse);

    expect(second).toBe(first);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(executableStatementRangeStartingAt(second, 10)?.sql).toBe("SELECT 2");
  });

  it("resolves statements with leading whitespace for gutter run buttons", () => {
    const doc = Text.of([" SELECT 1;", "  SELECT 2;", "\t SELECT 3;", "", "    "]);
    const cache = executableStatementRangeCacheForDoc(null, doc, "mysql");

    expect(executableStatementRangeStartingAt(cache, doc.line(1).from)?.sql).toBe("SELECT 1");
    expect(executableStatementRangeStartingAt(cache, doc.line(2).from)?.sql).toBe("SELECT 2");
    expect(executableStatementRangeStartingAt(cache, doc.line(3).from)?.sql).toBe("SELECT 3");
    expect(executableStatementRangeStartingAt(cache, doc.line(4).from)).toBeNull();
    expect(executableStatementRangeStartingAt(cache, doc.line(5).from)).toBeNull();
  });

  it("does not resolve gutter run buttons when non-whitespace precedes the statement on the same line", () => {
    const doc = Text.of(["/* comment */ SELECT 1;"]);
    const cache = executableStatementRangeCacheForDoc(null, doc, "mysql");

    expect(executableStatementRangeStartingAt(cache, doc.line(1).from)).toBeNull();
    expect(executableStatementRangeStartingAt(cache, doc.toString().indexOf("SELECT"))?.sql).toBe("SELECT 1");
  });

  it("resolves the current statement from a cursor inside a continuation line", () => {
    const doc = Text.of(["SELECT *", "FROM apis AS ap", "LIMIT 100;", "", "SELECT *", "FROM menus AS mn", "LIMIT 100;"]);
    const cache = executableStatementRangeCacheForDoc(null, doc, "mysql");
    const cursor = doc.toString().indexOf("menus");

    expect(executableStatementRangeAtCursor(cache, cursor)?.sql).toBe("SELECT *\nFROM menus AS mn\nLIMIT 100");
  });
});
