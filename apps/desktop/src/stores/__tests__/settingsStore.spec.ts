import { describe, expect, it } from "vitest";
import { normalizeEditorSettings } from "@/stores/settingsStore";

describe("normalizeEditorSettings", () => {
  it("enables automatic table aliases by default", () => {
    expect(normalizeEditorSettings({}).autoAliasTables).toBe(true);
  });

  it("preserves disabled automatic table aliases", () => {
    expect(normalizeEditorSettings({ autoAliasTables: false }).autoAliasTables).toBe(false);
  });

  it("defaults data grid search to row filtering and preserves highlight mode", () => {
    expect(normalizeEditorSettings({}).dataGridSearchMode).toBe("filter");
    expect(normalizeEditorSettings({ dataGridSearchMode: "highlight" }).dataGridSearchMode).toBe("highlight");
    expect(normalizeEditorSettings({ dataGridSearchMode: "invalid" as any }).dataGridSearchMode).toBe("filter");
  });
});
