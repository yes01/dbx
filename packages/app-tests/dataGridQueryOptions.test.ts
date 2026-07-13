import assert from "node:assert/strict";
import { test } from "vitest";
import { dataGridCountQueryOptions } from "../../apps/desktop/src/lib/dataGridQueryOptions.ts";

test("count queries inherit the connection query timeout", () => {
  assert.deepEqual(dataGridCountQueryOptions({ query_timeout_secs: 90 }), {
    maxRows: 1,
    timeoutSecs: 90,
  });
});

test("count queries preserve disabled timeouts", () => {
  assert.deepEqual(dataGridCountQueryOptions({ query_timeout_secs: 0 }), {
    maxRows: 1,
    timeoutSecs: 0,
  });
});

test("count queries keep the customized frontend default", () => {
  assert.deepEqual(dataGridCountQueryOptions(undefined), {
    maxRows: 1,
    timeoutSecs: 30,
  });
});
