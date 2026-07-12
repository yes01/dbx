import { describe, expect, it } from "vitest";
import { objectBrowserRowActivationAction } from "@/lib/objectBrowserRowActivation";
import type { ObjectBrowserRow } from "@/lib/objectBrowserRows";

function row(type: ObjectBrowserRow["type"]): ObjectBrowserRow {
  return { id: type, name: type, displayName: type, type };
}

describe("objectBrowserRowActivationAction", () => {
  it("preserves single-click table and source activation", () => {
    expect(objectBrowserRowActivationAction(row("TABLE"), 1, "single")).toBe("open-table");
    expect(objectBrowserRowActivationAction(row("VIEW"), 1, "single")).toBe("open-source");
    expect(objectBrowserRowActivationAction(row("TABLE"), 2, "single")).toBe("none");
  });

  it("keeps tables on double click while allowing one-click source preview", () => {
    expect(objectBrowserRowActivationAction(row("TABLE"), 1, "double")).toBe("none");
    expect(objectBrowserRowActivationAction(row("TABLE"), 2, "double")).toBe("open-table");
    expect(objectBrowserRowActivationAction(row("PROCEDURE"), 1, "double")).toBe("open-source");
    expect(objectBrowserRowActivationAction(row("PROCEDURE"), 2, "double")).toBe("none");
  });
});
