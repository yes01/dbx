<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { AlertTriangle, CalendarClock, DatabaseZap, Loader2, Play, Plus, Power, RefreshCcw, Square, Trash2, XCircle } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConnectionStore } from "@/stores/connectionStore";
import { useToast } from "@/composables/useToast";
import type { ConnectionConfig } from "@/types/database";
import * as api from "@/lib/api";
import {
  DAMENG_JOB_ENVIRONMENT_SQL,
  damengClearJobHistoriesSql,
  damengCreateJobSql,
  damengDropJobSql,
  damengEnableJobSql,
  damengInitJobSystemSql,
  damengJobHistoriesSql,
  damengJobListSql,
  damengJobSchedulesSql,
  damengJobStepsSql,
  damengRunJobSql,
  damengStopJobSql,
  isDamengJobEnvironmentMissingError,
  parseDamengJobEnvironmentReady,
  parseDamengJobs,
  queryResultToObjects,
  type DamengJob,
} from "@/lib/damengJobAdmin";

const props = defineProps<{
  connection: ConnectionConfig;
}>();

type DetailTab = "steps" | "schedules" | "histories";
const detailTabs: DetailTab[] = ["steps", "schedules", "histories"];

const { t } = useI18n();
const { toast } = useToast();
const connectionStore = useConnectionStore();

const jobs = ref<DamengJob[]>([]);
const selectedJobName = ref("");
const search = ref("");
const loadingJobs = ref(false);
const loadingDetails = ref(false);
const applying = ref(false);
const jobEnvironmentReady = ref(true);
const loadError = ref("");
const detailError = ref("");
const detailTab = ref<DetailTab>("steps");
const detailRows = ref<Record<string, unknown>[]>([]);

const createDialogOpen = ref(false);
const previewDialogOpen = ref(false);
const pendingSql = ref("");
const pendingAfterApply = ref<(() => Promise<void>) | undefined>();
const pendingDanger = ref(false);

const createName = ref("JOB_TEST");
const createEnabled = ref(true);
const createDescription = ref("");
const createStepName = ref("STEP1");
const createCommand = ref("SELECT 1;");
const createScheduleName = ref("SCHEDULE1");
const createScheduleMode = ref<"once" | "daily">("daily");
const createStartDate = ref("CURDATE");
const createStartTime = ref("00:00:00");
const createEndTime = ref("");
const createMinuteInterval = ref(0);

const supported = computed(() => props.connection.db_type === "dameng");
const executionDatabase = computed(() => (props.connection.db_type === "dameng" ? "" : props.connection.database || ""));
const useSystemJobTables = computed(() => props.connection.username?.trim().toUpperCase() === "SYSDBA");
const selectedJob = computed(() => jobs.value.find((job) => job.name === selectedJobName.value));
const filteredJobs = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return jobs.value;
  return jobs.value.filter((job) => `${job.name} ${job.owner || ""} ${job.description || ""}`.toLowerCase().includes(query));
});
const detailColumns = computed(() => {
  const set = new Set<string>();
  for (const row of detailRows.value) Object.keys(row).forEach((key) => set.add(key));
  return Array.from(set);
});
const canCreateJob = computed(() => createName.value.trim() && createStepName.value.trim() && createScheduleName.value.trim() && createCommand.value.trim());

async function ensureConnection() {
  await connectionStore.ensureConnected(props.connection.id);
}

async function loadJobs() {
  if (!supported.value) return;
  loadingJobs.value = true;
  loadError.value = "";
  try {
    await ensureConnection();
    const environment = await api.executeQuery(props.connection.id, executionDatabase.value, DAMENG_JOB_ENVIRONMENT_SQL, undefined, undefined, {
      maxRows: 1,
    });
    jobEnvironmentReady.value = parseDamengJobEnvironmentReady(environment);
    if (!jobEnvironmentReady.value) {
      jobs.value = [];
      detailRows.value = [];
      selectedJobName.value = "";
      return;
    }
    const result = await api.executeQuery(props.connection.id, executionDatabase.value, damengJobListSql(useSystemJobTables.value), undefined, undefined, {
      maxRows: 5000,
    });
    jobs.value = parseDamengJobs(result);
    if (!selectedJob.value) selectedJobName.value = jobs.value[0]?.name || "";
    await loadDetails();
  } catch (error: any) {
    const message = error?.message || String(error);
    if (isDamengJobEnvironmentMissingError(message)) {
      jobEnvironmentReady.value = false;
      loadError.value = "";
    } else {
      loadError.value = message;
    }
    jobs.value = [];
    detailRows.value = [];
  } finally {
    loadingJobs.value = false;
  }
}

async function loadDetails() {
  const job = selectedJob.value;
  if (!job) {
    detailRows.value = [];
    return;
  }
  loadingDetails.value = true;
  detailError.value = "";
  try {
    const sql = detailTab.value === "steps" ? damengJobStepsSql(job.id, useSystemJobTables.value) : detailTab.value === "schedules" ? damengJobSchedulesSql(job.id, useSystemJobTables.value) : damengJobHistoriesSql(job, useSystemJobTables.value);
    const result = await api.executeQuery(props.connection.id, executionDatabase.value, sql, undefined, undefined, {
      maxRows: 1000,
    });
    detailRows.value = queryResultToObjects(result);
  } catch (error: any) {
    detailError.value = error?.message || String(error);
    detailRows.value = [];
  } finally {
    loadingDetails.value = false;
  }
}

function selectJob(job: DamengJob) {
  selectedJobName.value = job.name;
}

function previewSql(sql: string, options: { danger?: boolean; afterApply?: () => Promise<void> } = {}) {
  pendingSql.value = sql;
  pendingDanger.value = !!options.danger;
  pendingAfterApply.value = options.afterApply;
  previewDialogOpen.value = true;
}

async function applyPendingSql() {
  if (!pendingSql.value.trim()) return;
  applying.value = true;
  try {
    await ensureConnection();
    await api.executeMulti(props.connection.id, executionDatabase.value, pendingSql.value, undefined, undefined, { maxRows: 1000 });
    toast(t("damengJobAdmin.applySuccess"), 2500);
    previewDialogOpen.value = false;
    await (pendingAfterApply.value?.() ?? Promise.resolve());
    await loadJobs();
  } catch (error: any) {
    toast(t("damengJobAdmin.applyFailed", { message: error?.message || String(error) }), 5000);
  } finally {
    applying.value = false;
  }
}

function previewCreateEnvironment() {
  previewSql(damengInitJobSystemSql());
}

function previewCreateJob() {
  if (!canCreateJob.value) return;
  previewSql(
    damengCreateJobSql({
      name: createName.value,
      enabled: createEnabled.value,
      description: createDescription.value,
      stepName: createStepName.value,
      command: createCommand.value,
      scheduleName: createScheduleName.value,
      scheduleMode: createScheduleMode.value,
      startDate: createStartDate.value,
      startTime: createStartTime.value,
      endTime: createEndTime.value,
      minuteInterval: createMinuteInterval.value,
    }),
    {
      afterApply: async () => {
        createDialogOpen.value = false;
      },
    },
  );
}

function previewEnableJob(enabled: boolean) {
  const job = selectedJob.value;
  if (job) previewSql(damengEnableJobSql(job.name, enabled));
}

function previewDropJob() {
  const job = selectedJob.value;
  if (job) previewSql(damengDropJobSql(job.name), { danger: true });
}

function previewRunJob() {
  const job = selectedJob.value;
  const sql = job ? damengRunJobSql(job.id) : "";
  if (sql) previewSql(sql);
}

function previewStopJob() {
  const job = selectedJob.value;
  const sql = job ? damengStopJobSql(job.id) : "";
  if (sql) previewSql(sql, { danger: true });
}

function previewClearHistories() {
  const job = selectedJob.value;
  if (job) previewSql(damengClearJobHistoriesSql(job.name), { danger: true });
}

watch(selectedJobName, () => loadDetails());
watch(detailTab, () => loadDetails());
onMounted(loadJobs);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background">
    <div class="flex items-center justify-between border-b px-4 py-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <DatabaseZap class="h-4 w-4 text-primary" />
          <div class="truncate text-sm font-semibold">{{ t("damengJobAdmin.title") }}</div>
        </div>
        <div class="mt-1 truncate text-xs text-muted-foreground">{{ connection.name }}</div>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" :disabled="loadingJobs" @click="loadJobs">
          <Loader2 v-if="loadingJobs" class="mr-1.5 h-3.5 w-3.5 animate-spin" />
          <RefreshCcw v-else class="mr-1.5 h-3.5 w-3.5" />
          {{ t("common.refresh") }}
        </Button>
        <Button size="sm" :disabled="!jobEnvironmentReady" @click="createDialogOpen = true">
          <Plus class="mr-1.5 h-3.5 w-3.5" />
          {{ t("damengJobAdmin.newJob") }}
        </Button>
      </div>
    </div>

    <div v-if="!supported" class="m-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
      {{ t("damengJobAdmin.unsupported") }}
    </div>

    <div v-else-if="!jobEnvironmentReady" class="m-4 space-y-3 rounded border border-amber-500/40 bg-amber-500/10 p-4">
      <div class="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
        <span>{{ t("damengJobAdmin.environmentMissing") }}</span>
      </div>
      <Button size="sm" @click="previewCreateEnvironment">{{ t("damengJobAdmin.initEnvironment") }}</Button>
    </div>

    <div v-else class="grid min-h-0 flex-1 grid-cols-[280px_1fr]">
      <aside class="flex min-h-0 flex-col border-r">
        <div class="border-b p-3">
          <Input v-model="search" class="h-8 text-xs" :placeholder="t('damengJobAdmin.searchJob')" />
        </div>
        <div v-if="loadError" class="m-3 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{{ loadError }}</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <button v-for="job in filteredJobs" :key="job.name" type="button" class="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-xs hover:bg-muted/50" :class="selectedJobName === job.name ? 'bg-muted' : ''" @click="selectJob(job)">
            <Power class="mt-0.5 h-3.5 w-3.5 shrink-0" :class="job.enabled ? 'text-green-500' : 'text-muted-foreground'" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ job.name }}</span>
              <span class="mt-0.5 block truncate text-muted-foreground">{{ job.owner || "-" }}</span>
            </span>
            <Badge v-if="job.running" variant="secondary" class="shrink-0 text-[10px]">{{ t("damengJobAdmin.running") }}</Badge>
          </button>
          <div v-if="!loadingJobs && filteredJobs.length === 0" class="p-4 text-center text-xs text-muted-foreground">{{ t("damengJobAdmin.emptyJobs") }}</div>
        </div>
      </aside>

      <main class="flex min-w-0 flex-col">
        <div v-if="selectedJob" class="border-b p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-base font-semibold">{{ selectedJob.name }}</h2>
                <Badge :variant="selectedJob.enabled ? 'default' : 'secondary'">{{ selectedJob.enabled ? t("damengJobAdmin.enabled") : t("damengJobAdmin.disabled") }}</Badge>
                <Badge v-if="selectedJob.running" variant="secondary">{{ t("damengJobAdmin.running") }}</Badge>
              </div>
              <p class="mt-1 truncate text-xs text-muted-foreground">{{ selectedJob.description || selectedJob.valid || "-" }}</p>
            </div>
            <div class="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" @click="previewRunJob"><Play class="mr-1.5 h-3.5 w-3.5" />{{ t("damengJobAdmin.run") }}</Button>
              <Button variant="outline" size="sm" @click="previewStopJob"><Square class="mr-1.5 h-3.5 w-3.5" />{{ t("damengJobAdmin.stop") }}</Button>
              <Button variant="outline" size="sm" @click="previewEnableJob(!selectedJob.enabled)">{{ selectedJob.enabled ? t("damengJobAdmin.disable") : t("damengJobAdmin.enable") }}</Button>
              <Button variant="outline" size="sm" @click="previewClearHistories"><CalendarClock class="mr-1.5 h-3.5 w-3.5" />{{ t("damengJobAdmin.clearHistory") }}</Button>
              <Button variant="destructive" size="sm" @click="previewDropJob"><Trash2 class="mr-1.5 h-3.5 w-3.5" />{{ t("damengJobAdmin.drop") }}</Button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 border-b px-4 py-2">
          <Button v-for="tab in detailTabs" :key="tab" size="sm" :variant="detailTab === tab ? 'default' : 'ghost'" @click="detailTab = tab">
            {{ t(`damengJobAdmin.${tab}`) }}
          </Button>
        </div>

        <div class="min-h-0 flex-1 overflow-auto p-4">
          <div v-if="loadingDetails" class="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" />
            {{ t("common.loading") }}
          </div>
          <div v-else-if="detailError" class="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{{ detailError }}</div>
          <div v-else-if="detailRows.length === 0" class="py-10 text-center text-sm text-muted-foreground">{{ t("damengJobAdmin.emptyDetails") }}</div>
          <div v-else class="overflow-auto rounded border">
            <table class="w-full min-w-max text-left text-xs">
              <thead class="bg-muted/60">
                <tr>
                  <th v-for="column in detailColumns" :key="column" class="border-b px-2 py-1.5 font-medium">{{ column }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in detailRows" :key="index" class="odd:bg-muted/20">
                  <td v-for="column in detailColumns" :key="column" class="max-w-[320px] border-b px-2 py-1.5 align-top">
                    <span class="block truncate">{{ row[column] ?? "" }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <Dialog v-model:open="createDialogOpen">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{{ t("damengJobAdmin.newJob") }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-3 py-2">
          <Input v-model="createName" :placeholder="t('damengJobAdmin.jobName')" />
          <Input v-model="createDescription" :placeholder="t('damengJobAdmin.description')" />
          <Input v-model="createStepName" :placeholder="t('damengJobAdmin.stepName')" />
          <textarea v-model="createCommand" class="min-h-[110px] rounded-md border bg-background p-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring" :placeholder="t('damengJobAdmin.command')" />
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="createScheduleName" :placeholder="t('damengJobAdmin.scheduleName')" />
            <Select v-model="createScheduleMode">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">{{ t("damengJobAdmin.once") }}</SelectItem>
                <SelectItem value="daily">{{ t("damengJobAdmin.daily") }}</SelectItem>
              </SelectContent>
            </Select>
            <Input v-model="createStartDate" :placeholder="t('damengJobAdmin.startDate')" />
            <Input v-model="createStartTime" :placeholder="t('damengJobAdmin.startTime')" />
            <Input v-model="createEndTime" :placeholder="t('damengJobAdmin.endTime')" />
            <Input v-model.number="createMinuteInterval" type="number" min="0" max="1439" :placeholder="t('damengJobAdmin.minuteInterval')" />
          </div>
          <label class="flex items-center gap-2 text-xs">
            <input v-model="createEnabled" type="checkbox" />
            {{ t("damengJobAdmin.enabled") }}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="createDialogOpen = false">{{ t("common.cancel") }}</Button>
          <Button :disabled="!canCreateJob" @click="previewCreateJob">{{ t("damengJobAdmin.previewSql") }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="previewDialogOpen">
      <DialogContent class="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <XCircle v-if="pendingDanger" class="h-4 w-4 text-destructive" />
            {{ t("damengJobAdmin.previewSql") }}
          </DialogTitle>
        </DialogHeader>
        <pre class="max-h-[360px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-5">{{ pendingSql }}</pre>
        <DialogFooter>
          <Button variant="outline" :disabled="applying" @click="previewDialogOpen = false">{{ t("common.cancel") }}</Button>
          <Button :variant="pendingDanger ? 'destructive' : 'default'" :disabled="applying" @click="applyPendingSql">
            <Loader2 v-if="applying" class="mr-1.5 h-3.5 w-3.5 animate-spin" />
            {{ t("damengJobAdmin.apply") }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
