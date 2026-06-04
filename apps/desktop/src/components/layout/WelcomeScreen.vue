<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { FilePlus2, Plus, History, Download, Database, Search, ShieldCheck, Sparkles } from "@lucide/vue";
import DatabaseIcon from "@/components/icons/DatabaseIcon.vue";
import {
  connectionDriverLabel,
  connectionIconType,
  connectionRedactedNameLabel,
  connectionRedactedOptionSubtitle,
} from "@/lib/connectionPresentation";
import type { ConnectionConfig } from "@/types/database";

defineProps<{
  connectionStats: { total: number; connected: number; types: number };
  recentConnections: ConnectionConfig[];
  appVersion: string;
  hasConnections: boolean;
}>();

const emit = defineEmits<{
  "open-connection-query": [connectionId: string];
  "new-connection": [];
  "new-query": [];
  "show-history": [];
  "import-config": [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background">
    <div class="mx-auto flex min-h-full w-full min-w-0 max-w-5xl flex-col justify-center gap-6 px-8 py-10">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-lg border bg-muted/20 px-4 py-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Database class="h-3.5 w-3.5" /> {{ t("welcome.connections") }}
          </div>
          <div class="mt-2 text-2xl font-semibold">{{ connectionStats.total }}</div>
        </div>
        <div class="rounded-lg border bg-muted/20 px-4 py-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck class="h-3.5 w-3.5" /> {{ t("welcome.connected") }}
          </div>
          <div class="mt-2 text-2xl font-semibold">{{ connectionStats.connected }}</div>
        </div>
        <div class="rounded-lg border bg-muted/20 px-4 py-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles class="h-3.5 w-3.5" /> {{ t("welcome.databaseTypes") }}
          </div>
          <div class="mt-2 text-2xl font-semibold">{{ connectionStats.types }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="rounded-lg border">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <div class="text-sm font-medium">{{ t("welcome.quickConnections") }}</div>
          </div>
          <div class="divide-y">
            <button
              v-for="connection in recentConnections"
              :key="connection.id"
              class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
              @click="emit('open-connection-query', connection.id)"
            >
              <DatabaseIcon :db-type="connectionIconType(connection)" class="h-4 w-4" />
              <span class="h-5 w-1 rounded-full shrink-0" :style="{ backgroundColor: connection.color || '#9ca3af' }" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{{ connectionRedactedNameLabel(connection) }}</div>
                <div class="truncate text-xs text-muted-foreground">
                  {{ connectionRedactedOptionSubtitle(connection) || connectionDriverLabel(connection) }}
                </div>
              </div>
              <FilePlus2 class="h-4 w-4 text-muted-foreground" />
            </button>
            <div v-if="recentConnections.length === 0" class="px-4 py-8 text-sm text-muted-foreground">
              {{ t("sidebar.noConnections") }}
            </div>
          </div>
        </div>

        <div class="rounded-lg border">
          <div class="border-b px-4 py-3">
            <div class="text-sm font-medium">{{ t("welcome.shortcuts") }}</div>
          </div>
          <div class="grid gap-1 p-2">
            <button
              class="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50"
              @click="emit('new-connection')"
            >
              <Plus class="h-4 w-4" /> {{ t("toolbar.newConnection") }}
            </button>
            <button
              class="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50"
              :disabled="!hasConnections"
              @click="emit('new-query')"
            >
              <FilePlus2 class="h-4 w-4" /> {{ t("toolbar.newQuery") }}
            </button>
            <button
              class="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50"
              @click="emit('show-history')"
            >
              <History class="h-4 w-4" /> {{ t("history.title") }}
            </button>
            <button
              class="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50"
              @click="emit('import-config')"
            >
              <Download class="h-4 w-4" /> {{ t("sidebar.import") }}
            </button>
            <div class="mt-2 rounded-md bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
              <Search class="mr-1 inline h-3.5 w-3.5" />
              {{ t("welcome.tip") }}
            </div>
          </div>
        </div>
      </div>

      <!-- Project Info -->
      <div class="mt-2 flex items-center justify-center gap-3 text-[11px] text-muted-foreground/60">
        <span>TestTeam DBX {{ appVersion ? "v" + appVersion : "" }}</span>
      </div>
    </div>
  </div>
</template>
