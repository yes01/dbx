import { describe, expect, it } from "vitest";
import { safeJsonFormat } from "@/lib/safeJsonFormat";

describe("safeJsonFormat", () => {
  it("formats JSON without losing large integer precision", () => {
    expect(safeJsonFormat('{"id":87712409002717401,"nested":[-87712409002717402]}', 2)).toBe('{\n  "id": 87712409002717401,\n  "nested": [\n    -87712409002717402\n  ]\n}');
  });

  it("keeps safe integers as regular JSON numbers", () => {
    expect(safeJsonFormat('{"id":9007199254740991}', 2)).toBe('{\n  "id": 9007199254740991\n}');
  });

  it("does not treat digit strings as JSON numbers", () => {
    expect(safeJsonFormat('{"id":"87712409002717401"}', 2)).toBe('{\n  "id": "87712409002717401"\n}');
  });
});
