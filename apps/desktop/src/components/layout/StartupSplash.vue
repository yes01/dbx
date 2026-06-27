<script setup lang="ts">
import LiquidLoader from "@/components/ui/LiquidLoader.vue";
</script>

<template>
  <div class="startup-splash" role="status" aria-live="polite" aria-label="DBX is starting">
    <div class="startup-splash__panel">
      <LiquidLoader />
      <div class="startup-splash__copy">
        <span class="startup-splash__label">TestTeam</span>
        <span class="startup-splash__hero">DBX</span>
        <div class="startup-splash__dots">
          <span class="startup-splash__dot" />
          <span class="startup-splash__dot" />
          <span class="startup-splash__dot" />
        </div>
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
  gap: 2px;
}

.startup-splash__label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.startup-splash__hero {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.15;
  background: linear-gradient(135deg, oklch(0.62 0.2 300), oklch(0.61 0.19 255), oklch(0.68 0.15 215), oklch(0.72 0.15 165), oklch(0.78 0.16 112), oklch(0.75 0.17 68), oklch(0.66 0.2 35));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: startup-splash-gradient 4s ease-in-out infinite;
}

.startup-splash__dots {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
}

.startup-splash__dot {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--muted-foreground);
  opacity: 0.25;
  animation: startup-splash-dot 1.4s ease-in-out infinite;
}

.startup-splash__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.startup-splash__dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* ── Keyframes ── */
@keyframes startup-splash-gradient {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes startup-splash-dot {
  0%,
  80%,
  100% {
    opacity: 0.2;
    transform: scale(0.85);
  }
  40% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* ── Leave transition (used by <Transition name="startup-splash"> in App.vue) ── */
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
  .startup-splash__hero {
    animation: none;
  }

  .startup-splash__dot {
    animation: none;
    opacity: 0.5;
  }

  .startup-splash-leave-active {
    transition: opacity 160ms ease-out;
  }

  .startup-splash-leave-to {
    transform: none;
  }
}
</style>
