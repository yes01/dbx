import type { ObjectBrowserRow } from "@/lib/objectBrowserRows";

export type ObjectBrowserRowActivationAction = "open-table" | "open-source" | "none";

function supportsSourcePreview(row: ObjectBrowserRow): boolean {
  return row.type !== "TABLE";
}

export function objectBrowserRowActivationAction(row: ObjectBrowserRow, clickDetail: number, activation: "single" | "double"): ObjectBrowserRowActivationAction {
  if (activation === "double") {
    if (row.type === "TABLE") return clickDetail === 2 ? "open-table" : "none";
    return supportsSourcePreview(row) && clickDetail === 1 ? "open-source" : "none";
  }

  if (clickDetail !== 1) return "none";
  return row.type === "TABLE" ? "open-table" : supportsSourcePreview(row) ? "open-source" : "none";
}
