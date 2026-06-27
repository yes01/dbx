<script setup lang="ts">
import LiquidLoader from "@/components/ui/LiquidLoader.vue";
</script>

<template>
  <div class="startup-splash" role="status" aria-live="polite" aria-label="DBX is starting">
    <div class="startup-splash__panel">
      <LiquidLoader />
      <div class="startup-splash__copy">
        <span class="startup-splash__name">TestTeam DBX</span>
        <span class="startup-splash__state">Loading workspace</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.startup-splash {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 42%, color-mix(in oklch, var(--primary) 9%, transparent) 0, transparent 32%), linear-gradient(180deg, color-mix(in oklch, var(--background) 94%, var(--muted) 6%), var(--background));
  color: var(--foreground);
  pointer-events: auto;
}

.startup-splash__panel {
  display: flex;
  min-width: 300px;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.startup-splash__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.startup-splash__name {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0;
}

.startup-splash__state {
  color: var(--muted-foreground);
  font-size: 12px;
}

.startup-splash-leave-active {
  transition:
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.startup-splash-leave-to {
  opacity: 0;
  transform: scale(1.01);
}

@media (prefers-reduced-motion: reduce) {
  .startup-splash-leave-active {
    transition: opacity 160ms ease-out;
  }

  .startup-splash-leave-to {
    transform: none;
  }
}
</style>
