import assert from "node:assert/strict";
import { test } from "vitest";
import { buildMongoCopyDocumentFromOriginal, buildMongoCopyInsertDocument, buildMongoInsertDocument, buildMongoUpdateDocument, formatMongoShellLiteral, parseMongoDocumentInputValue } from "../../apps/desktop/src/lib/mongoDocumentValues.ts";

test("parses Mongo shell ISODate literals as extended JSON dates", () => {
  assert.deepEqual(parseMongoDocumentInputValue('ISODate("2026-06-10T13:59:31.287Z")'), {
    $date: "2026-06-10T13:59:31.287Z",
  });
  assert.deepEqual(parseMongoDocumentInputValue('"ISODate(\\"2026-06-10T13:59:31.287Z\\")"'), {
    $date: "2026-06-10T13:59:31.287Z",
  });
});

test("parses legacy Mongo date display values as UTC dates", () => {
  assert.deepEqual(parseMongoDocumentInputValue("2025-08-14 02:25:43.718"), {
    $date: "2025-08-14T02:25:43.718Z",
  });
  assert.equal(parseMongoDocumentInputValue('"2025-08-14 02:25:43.718"'), "2025-08-14 02:25:43.718");
});

test("builds Mongo grid updates with set and unset operators", () => {
  const changes = new Map<number, string | number | boolean | null>([
    [1, "Ada"],
    [2, 'ISODate("2026-06-10T13:59:31.287Z")'],
    [3, null],
  ]);

  assert.deepEqual(buildMongoUpdateDocument(changes, ["_id", "name", "createdAt", "archivedAt"]), {
    $set: {
      name: "Ada",
      createdAt: { $date: "2026-06-10T13:59:31.287Z" },
    },
    $unset: {
      archivedAt: "",
    },
  });
});

test("preserves JSON-looking and typed-looking strings in existing Mongo fields", () => {
  const original = {
    _id: "1",
    answer: '{"action":"New"}',
    numericText: "42",
    booleanText: "true",
    profile: { role: "admin" },
  };
  const changes = new Map<number, string | number | boolean | null>([
    [1, '{"action":"Updated"}'],
    [2, "43"],
    [3, "false"],
    [4, '{"role":"maintainer"}'],
  ]);

  assert.deepEqual(buildMongoUpdateDocument(changes, ["_id", "answer", "numericText", "booleanText", "profile"], original), {
    $set: {
      answer: '{"action":"Updated"}',
      numericText: "43",
      booleanText: "false",
      profile: { role: "maintainer" },
    },
  });
});

test("builds Mongo inserts with parsed date values", () => {
  assert.deepEqual(buildMongoInsertDocument(["ignored", 'new Date("2026-06-10T13:59:31.287Z")'], ["_id", "createdAt"]), {
    createdAt: { $date: "2026-06-10T13:59:31.287Z" },
  });
});

test("builds Mongo copy inserts with ObjectId and parsed document values", () => {
  assert.deepEqual(buildMongoCopyInsertDocument(["6743e4bfa3f6f84bc3fff6c8", "577", '{"endingBalance":{"beginningBalance":"0"},"Line":[]}', 'ISODate("2024-11-25T02:45:36.184Z")'], ["_id", "accountId", "data", "lastUpdatedDate"]), {
    _id: { $oid: "6743e4bfa3f6f84bc3fff6c8" },
    accountId: 577,
    data: {
      endingBalance: {
        beginningBalance: "0",
      },
      Line: [],
    },
    lastUpdatedDate: { $date: "2024-11-25T02:45:36.184Z" },
  });
});

test("builds Mongo copy inserts without primary keys when requested", () => {
  assert.deepEqual(buildMongoCopyInsertDocument(["6743e4bfa3f6f84bc3fff6c8", "done"], ["_id", "status"], { excludePrimaryKeys: true }), {
    status: "done",
  });
});

test("projects original Mongo values and applies only explicit copy edits", () => {
  const original = {
    _id: { $oid: "6743e4bfa3f6f84bc3fff6c8" },
    numericText: "123",
    booleanText: "true",
    profile: { role: "admin" },
    hidden: "not selected",
  };

  assert.deepEqual(
    buildMongoCopyDocumentFromOriginal(original, ["ignored", "456", '{"role":"maintainer"}'], ["numericText", "booleanText", "profile"], [false, true, false]),
    {
      numericText: "123",
      booleanText: "456",
      profile: { role: "admin" },
    },
  );
  assert.deepEqual(
    buildMongoCopyDocumentFromOriginal(original, ["ignored", "ignored"], ["_id", "numericText"], [false, false], { excludePrimaryKeys: true }),
    { numericText: "123" },
  );
});

test("formats extended JSON dates as Mongo shell ISODate literals", () => {
  assert.equal(
    formatMongoShellLiteral({
      $set: {
        createdAt: { $date: "2026-06-10T13:59:31.287Z" },
      },
    }),
    '{"$set":{"createdAt":ISODate("2026-06-10T13:59:31.287Z")}}',
  );
});

test("formats extended JSON object ids as Mongo shell ObjectId literals", () => {
  assert.equal(formatMongoShellLiteral({ $oid: "6743e4bfa3f6f84bc3fff6c8" }), 'ObjectId("6743e4bfa3f6f84bc3fff6c8")');
});
