import { describe, expect, it } from "vitest";
import { formatElapsedSeconds } from "../elapsedTime";

describe("elapsedTime", () => {
  it("formats milliseconds as fixed seconds", () => {
    expect(formatElapsedSeconds(0)).toBe("0.00");
    expect(formatElapsedSeconds(1234)).toBe("1.23");
    expect(formatElapsedSeconds(Number.NaN)).toBe("0.00");
    expect(formatElapsedSeconds(-50)).toBe("0.00");
  });
});
