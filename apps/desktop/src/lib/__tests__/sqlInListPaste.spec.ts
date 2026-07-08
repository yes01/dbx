import { describe, expect, it } from "vitest";
import { buildSqlInConditionFromPasteSource, insertTextForSqlInCondition } from "@/lib/sqlInListPaste";

describe("sqlInListPaste", () => {
  it("builds an IN condition from line-separated values", () => {
    expect(buildSqlInConditionFromPasteSource("1\n2\nabc")).toEqual({
      ok: true,
      sql: "IN ('1', '2', 'abc')",
      valueCount: 3,
    });
  });

  it("escapes quoted strings", () => {
    expect(buildSqlInConditionFromPasteSource("'O''Reilly', \"Book\"")).toEqual({
      ok: true,
      sql: "IN ('O''Reilly', 'Book')",
      valueCount: 2,
    });
  });

  it("inserts only the list after an existing IN keyword", () => {
    expect(insertTextForSqlInCondition("IN (1, 2)", "where id in ")).toBe("(1, 2)");
  });
});
