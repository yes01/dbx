import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

function installLocalStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
    removeItem: vi.fn((key: string) => data.delete(key)),
  });
}

describe("queryStore dropped table object tabs", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    installLocalStorage();
    setActivePinia(createPinia());
  });

  it("closes data and structure tabs for a dropped table object", async () => {
    const { useQueryStore } = await import("@/stores/queryStore");
    const store = useQueryStore();

    const queryId = store.createTab("pg-1", "app", "Query", "query", "public");
    const dataId = store.createTab("pg-1", "app", "users", "data", "public");
    store.setTableMeta(dataId, {
      schema: "public",
      tableName: "users",
      tableType: "TABLE",
      columns: [],
      primaryKeys: [],
    });
    const otherSchemaDataId = store.createTab("pg-1", "app", "users", "data", "archive");
    store.setTableMeta(otherSchemaDataId, {
      schema: "archive",
      tableName: "users",
      tableType: "TABLE",
      columns: [],
      primaryKeys: [],
    });
    const otherConnectionDataId = store.createTab("pg-2", "app", "users", "data", "public");
    store.setTableMeta(otherConnectionDataId, {
      schema: "public",
      tableName: "users",
      tableType: "TABLE",
      columns: [],
      primaryKeys: [],
    });
    const structureId = store.openTableStructure("pg-1", "app", "public", "users");

    store.activeTabId = dataId;
    store.closeDroppedTableObjectTabs({
      connectionId: "pg-1",
      database: "app",
      schema: "public",
      name: "users",
      objectType: "TABLE",
    });

    expect(store.tabs.some((tab) => tab.id === dataId)).toBe(false);
    expect(store.tabs.some((tab) => tab.id === structureId)).toBe(false);
    expect(store.tabs.some((tab) => tab.id === otherSchemaDataId)).toBe(true);
    expect(store.tabs.some((tab) => tab.id === otherConnectionDataId)).toBe(true);
    expect(store.tabs.some((tab) => tab.id === queryId)).toBe(true);
    expect(store.activeTabId).not.toBe(dataId);
  });

  it("closes data tabs but keeps structure tabs for dropped views", async () => {
    const { useQueryStore } = await import("@/stores/queryStore");
    const store = useQueryStore();

    const dataId = store.createTab("pg-1", "app", "report_view", "data", "public");
    store.setTableMeta(dataId, {
      schema: "public",
      tableName: "report_view",
      tableType: "VIEW",
      columns: [],
      primaryKeys: [],
    });
    const structureId = store.openTableStructure("pg-1", "app", "public", "report_view");

    store.closeDroppedTableObjectTabs({
      connectionId: "pg-1",
      database: "app",
      schema: "public",
      name: "report_view",
      objectType: "VIEW",
    });

    expect(store.tabs.some((tab) => tab.id === dataId)).toBe(false);
    expect(store.tabs.some((tab) => tab.id === structureId)).toBe(true);
  });

  it("matches dropped table schema candidates", async () => {
    const { useQueryStore } = await import("@/stores/queryStore");
    const store = useQueryStore();

    const dataId = store.createTab("pg-1", "app", "orders", "data", "app");
    store.setTableMeta(dataId, {
      schema: "app",
      tableName: "orders",
      tableType: "TABLE",
      columns: [],
      primaryKeys: [],
    });
    const structureId = store.openTableStructure("pg-1", "app", undefined, "orders");

    store.closeDroppedTableObjectTabs({
      connectionId: "pg-1",
      database: "app",
      schema: "app",
      schemaCandidates: [undefined, "app"],
      name: "orders",
      objectType: "TABLE",
    });

    expect(store.tabs.some((tab) => tab.id === dataId)).toBe(false);
    expect(store.tabs.some((tab) => tab.id === structureId)).toBe(false);
  });
});
