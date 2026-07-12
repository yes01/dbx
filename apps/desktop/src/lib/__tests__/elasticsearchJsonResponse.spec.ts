import { describe, expect, it } from "vitest";
import { elasticsearchJsonResponseForResult } from "@/lib/elasticsearchJsonResponse";
import type { QueryResult } from "@/types/database";

function jsonResponse(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    columns: ["status", "response"],
    rows: [[200, '{"acknowledged":true}']],
    affected_rows: 0,
    execution_time_ms: 1,
    ...overrides,
  };
}

describe("elasticsearchJsonResponseForResult", () => {
  it("classifies explicit Elasticsearch REST JSON results", () => {
    expect(elasticsearchJsonResponseForResult("elasticsearch", "GET /products/_mapping", jsonResponse())).toEqual({
      status: 200,
      body: '{"acknowledged":true}',
    });
  });

  it("does not replace SQL, CAT, or other database result grids", () => {
    const response = jsonResponse();
    expect(elasticsearchJsonResponseForResult("elasticsearch", "SELECT * FROM products", response)).toBeUndefined();
    expect(elasticsearchJsonResponseForResult("postgres", "GET /products/_mapping", response)).toBeUndefined();
    expect(
      elasticsearchJsonResponseForResult("elasticsearch", "GET /_cat/indices", {
        ...response,
        columns: ["response"],
        rows: [["green open products"]],
      }),
    ).toBeUndefined();
  });

  it("rejects malformed status and row shapes", () => {
    expect(elasticsearchJsonResponseForResult("elasticsearch", "GET /products", jsonResponse({ rows: [[99, "{}"]] }))).toBeUndefined();
    expect(elasticsearchJsonResponseForResult("elasticsearch", "GET /products", jsonResponse({ rows: [["200", "{}"]] }))).toBeUndefined();
    expect(elasticsearchJsonResponseForResult("elasticsearch", "GET /products", jsonResponse({ columns: ["response", "status"] }))).toBeUndefined();
  });
});
