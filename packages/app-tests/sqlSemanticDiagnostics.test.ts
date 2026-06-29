import { strict as assert } from "node:assert";
import { test } from "vitest";
import { buildSqlParserErrorDiagnostic, buildSqlSemanticDiagnostics, areSqlSemanticDiagnosticsEqual, isSqlSemanticDiagnosticInputContext, shouldRunSqlSemanticDiagnostics, sqlSemanticDiagnosticRangesForViewport } from "../../apps/desktop/src/lib/sqlSemanticDiagnostics.ts";
import type { SqlReferenceAnalysis } from "../../apps/desktop/src/types/database.ts";

const span = (startColumn: number, endColumn: number) => ({
  start_line: 1,
  start_column: startColumn,
  end_line: 1,
  end_column: endColumn,
});

test("flags missing qualified columns against the referenced table", () => {
  const analysis: SqlReferenceAnalysis = {
    tables: [{ name: "users", alias: "u", span: span(23, 27) }],
    columns: [
      { name: "missing", qualifier: "u", span: span(10, 16) },
      { name: "id", qualifier: "u", span: span(34, 35) },
    ],
  };

  const diagnostics = buildSqlSemanticDiagnostics(analysis, {
    tables: [{ name: "users", type: "table" }],
    columnsByTable: new Map([["users", [{ name: "id", table: "users" }]]]),
  });

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.message),
    ["Unknown column u.missing"],
  );
});

test("does not flag unqualified columns when multiple tables make ownership ambiguous", () => {
  const analysis: SqlReferenceAnalysis = {
    tables: [
      { name: "users", alias: "u", span: span(25, 29) },
      { name: "orders", alias: "o", span: span(35, 40) },
    ],
    columns: [{ name: "id", span: span(8, 9) }],
  };

  const diagnostics = buildSqlSemanticDiagnostics(analysis, {
    tables: [
      { name: "users", type: "table" },
      { name: "orders", type: "table" },
    ],
    columnsByTable: new Map(),
  });

  assert.deepEqual(diagnostics, []);
});

test("builds a syntax diagnostic from parser errors with line and column", () => {
  const diagnostic = buildSqlParserErrorDiagnostic("Expected: end of statement, found: FOM at Line: 1, Column: 10", "SELECT * FOM");

  assert.equal(diagnostic?.message, "Expected: end of statement, found: FOM at Line: 1, Column: 10");
  assert.deepEqual(diagnostic?.span, span(10, 12));
});

test("compares diagnostics by severity message and span", () => {
  const diagnostics = [
    {
      message: "Unknown column u.missing",
      severity: "warning" as const,
      span: span(10, 16),
    },
  ];

  assert.equal(
    areSqlSemanticDiagnosticsEqual(
      diagnostics,
      diagnostics.map((item) => ({ ...item })),
    ),
    true,
  );
  assert.equal(areSqlSemanticDiagnosticsEqual(diagnostics, [{ ...diagnostics[0], message: "Unknown column u.name" }]), false);
});

test("defers diagnostics while the cursor is in table completion context", () => {
  assert.equal(shouldRunSqlSemanticDiagnostics("select * from ", "select * from ".length), false);
  assert.equal(shouldRunSqlSemanticDiagnostics("select * from us", "select * from us".length), false);
  assert.equal(shouldRunSqlSemanticDiagnostics("select u.", "select u.".length), false);
  assert.equal(shouldRunSqlSemanticDiagnostics("select * from users where missing = 1", 42), true);
});

test("skips diagnostics for MongoDB connections", () => {
  assert.equal(shouldRunSqlSemanticDiagnostics("db.my_collection.find({})", 0, { databaseType: "mongodb" }), false);
});

test("skips diagnostics for Elasticsearch connections", () => {
  assert.equal(shouldRunSqlSemanticDiagnostics("db.my_collection.find({})", 0, { databaseType: "elasticsearch" }), false);
});

test("still runs diagnostics for SQL connections", () => {
  assert.equal(shouldRunSqlSemanticDiagnostics("SELECT * FROM users WHERE id = 1", 42, { databaseType: "mysql" }), true);
});

test("selects complete SQL statements intersecting the visible viewport for diagnostics", () => {
  const sql = "SELECT * FROM first;\nSELECT id, missing_field FROM second WHERE id > 1;\nSELECT * FROM third;";
  const visibleFrom = sql.indexOf("missing_field");
  const visibleTo = visibleFrom + "missing_field".length;

  const ranges = sqlSemanticDiagnosticRangesForViewport(sql, [{ from: visibleFrom, to: visibleTo }], "mysql");

  assert.equal(ranges.length, 1);
  assert.equal(ranges[0]?.sql, "SELECT id, missing_field FROM second WHERE id > 1");
  assert.equal(ranges[0]?.from, sql.indexOf("SELECT id"));
  assert.equal(ranges[0]?.to, sql.indexOf(";\nSELECT * FROM third"));
});

test("keeps a long statement complete when only its middle is visible", () => {
  const sql = "SELECT id,\n  name,\n  missing_field\nFROM users\nWHERE id > 1;";
  const visibleFrom = sql.indexOf("missing_field");
  const visibleTo = sql.indexOf("FROM users");

  const ranges = sqlSemanticDiagnosticRangesForViewport(sql, [{ from: visibleFrom, to: visibleTo }], "mysql");

  assert.deepEqual(
    ranges.map((range) => range.sql),
    ["SELECT id,\n  name,\n  missing_field\nFROM users\nWHERE id > 1"],
  );
});

test("uses executable soft statement ranges for viewport diagnostics", () => {
  const sql = "SELECT * FROM first\nSELECT missing_field FROM second";
  const visibleFrom = sql.indexOf("missing_field");
  const ranges = sqlSemanticDiagnosticRangesForViewport(sql, [{ from: visibleFrom, to: visibleFrom + 1 }], "mysql");

  assert.deepEqual(
    ranges.map((range) => range.sql),
    ["SELECT missing_field FROM second"],
  );
});
