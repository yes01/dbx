const REDIS_GLOB_SPECIAL_CHARS = /[\\*?[\]]/g;
const REDIS_SEARCH_SCAN_COUNT = 50_000;

export function escapeRedisGlobText(value: string): string {
  return value.replace(REDIS_GLOB_SPECIAL_CHARS, "\\$&");
}

export function redisKeySearchPattern(value: string, fuzzy: boolean): string {
  const pattern = value.trim();
  if (!pattern) return "*";
  return fuzzy ? `*${escapeRedisGlobText(pattern)}*` : pattern;
}

export function redisKeyScanCount(pageSize: number, searching: boolean): number {
  const normalizedPageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
  return searching ? Math.max(normalizedPageSize, REDIS_SEARCH_SCAN_COUNT) : normalizedPageSize;
}
