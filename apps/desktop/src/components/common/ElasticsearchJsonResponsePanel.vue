<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Code2, Copy } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import RedisJsonTree from "@/components/redis/RedisJsonTree.vue";
import { useToast } from "@/composables/useToast";
import { useTheme } from "@/composables/useTheme";
import { copyToClipboard } from "@/lib/clipboard";
import { createRedisShikiJsonHighlighter, type RedisJsonHighlighter } from "@/lib/redisJsonHighlighter";
import { parseJsonPreservingLargeNumbers } from "@/lib/safeJsonFormat";

const props = defineProps<{ status: number; body: string }>();
const { t } = useI18n();
const { toast } = useToast();
const { isDark } = useTheme();
const responseView = ref<"raw" | "json">("json");
const jsonHighlighter = ref<RedisJsonHighlighter>();

const parsedBody = computed(() => {
  try {
    return { valid: true, value: parseJsonPreservingLargeNumbers(props.body) };
  } catch {
    return { valid: false, value: null };
  }
});
const statusClass = computed(() => {
  if (props.status >= 500) return "border-destructive/40 bg-destructive/10 text-destructive";
  if (props.status >= 400) return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (props.status >= 300) return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
});

watch(
  () => props.body,
  () => {
    responseView.value = parsedBody.value.valid ? "json" : "raw";
  },
  { immediate: true },
);

async function copyResponse() {
  try {
    await copyToClipboard(props.body);
    toast(t("grid.copied"), 2000);
  } catch (error: any) {
    toast(t("grid.copyFailed", { message: error?.message || String(error) }), 5000);
  }
}

onMounted(() => {
  void createRedisShikiJsonHighlighter({ appearance: () => (isDark.value ? "dark" : "light") })
    .then((highlight) => {
      jsonHighlighter.value = highlight;
    })
    .catch(() => {
      jsonHighlighter.value = undefined;
    });
});
</script>

<template>
  <section data-elasticsearch-json-response-root class="flex h-full min-h-0 flex-col bg-background" :aria-label="t('redis.jsonView')">
    <header class="flex min-h-10 shrink-0 items-center gap-2 border-b bg-muted/25 px-3 py-1.5 text-xs">
      <Code2 class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div class="inline-flex h-7 items-center rounded-md border bg-muted/45 p-0.5">
        <button type="button" class="h-6 rounded px-2 text-xs" :class="responseView === 'raw' ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="responseView = 'raw'">
          {{ t("redis.rawContent") }}
        </button>
        <button type="button" class="h-6 rounded px-2 text-xs" :class="responseView === 'json' ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" :disabled="!parsedBody.valid" @click="responseView = 'json'">
          {{ t("redis.jsonView") }}
        </button>
      </div>
      <span class="ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums" :class="statusClass" role="status">HTTP {{ status }}</span>
      <Button variant="ghost" size="icon" class="h-7 w-7 shrink-0" :title="t('grid.copyJson')" :aria-label="t('grid.copyJson')" @click="copyResponse">
        <Copy class="h-3.5 w-3.5" />
      </Button>
    </header>
    <div class="min-h-0 flex-1 overflow-auto bg-background p-4">
      <pre v-show="responseView === 'raw' || !parsedBody.valid" class="m-0 min-h-full bg-transparent p-0 font-mono text-sm leading-6 whitespace-pre-wrap break-words">{{ body }}</pre>
      <RedisJsonTree v-if="parsedBody.valid" v-show="responseView === 'json'" :value="parsedBody.value" :highlight-json="jsonHighlighter" />
    </div>
  </section>
</template>
