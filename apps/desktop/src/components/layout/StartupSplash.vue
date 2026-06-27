<script setup lang="ts">
const bars = [
  { className: "startup-splash__bar--one", delay: "0ms" },
  { className: "startup-splash__bar--two", delay: "120ms" },
  { className: "startup-splash__bar--three", delay: "240ms" },
  { className: "startup-splash__bar--four", delay: "360ms" },
  { className: "startup-splash__bar--five", delay: "480ms" },
  { className: "startup-splash__bar--six", delay: "600ms" },
  { className: "startup-splash__bar--seven", delay: "720ms" },
];
</script>

<template>
  <div class="startup-splash" role="status" aria-live="polite" aria-label="DBX is starting">
    <div class="startup-splash__panel">
      <div class="startup-splash__mark" aria-hidden="true">
        <div v-for="(bar, index) in bars" :key="index" class="startup-splash__column" :style="{ '--delay': bar.delay }">
          <span class="startup-splash__drop" :class="bar.className" />
          <span class="startup-splash__bar" :class="bar.className" />
          <span class="startup-splash__base" :class="bar.className" />
        </div>
      </div>
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
  background: radial-gradient(circle at 50% 42%, color-mix(in oklch, var(--primary) 8%, transparent) 0, transparent 34%), var(--background);
  color: var(--foreground);
  pointer-events: auto;
}

.startup-splash__panel {
  display: flex;
  min-width: 300px;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.startup-splash__mark {
  display: flex;
  height: 124px;
  align-items: end;
  gap: 10px;
  padding: 18px 20px;
}

.startup-splash__column {
  position: relative;
  display: flex;
  width: 18px;
  height: 104px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.startup-splash__drop,
.startup-splash__bar,
.startup-splash__base {
  display: block;
  background: var(--splash-fill);
  box-shadow: 0 0 18px color-mix(in oklch, var(--splash-fill) 28%, transparent);
}

.startup-splash__drop {
  width: 9px;
  height: 9px;
  margin-bottom: 8px;
  border-radius: 999px;
  opacity: 0;
  animation: startup-splash-drop 1.65s var(--delay) ease-out infinite;
}

.startup-splash__bar {
  width: 12px;
  min-height: 18px;
  border-radius: 999px;
  transform-origin: bottom;
  animation: startup-splash-bar 1.65s var(--delay) cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.startup-splash__bar::before {
  content: "";
  display: block;
  height: 16px;
  border-radius: 999px 999px 60% 60%;
  background: color-mix(in oklch, white 34%, transparent);
}

.startup-splash__base {
  width: 7px;
  height: 7px;
  margin-top: 7px;
  border-radius: 999px;
  opacity: 0.72;
  animation: startup-splash-base 1.65s var(--delay) ease-out infinite;
}

.startup-splash__bar--one {
  --splash-fill: oklch(0.58 0.16 262);
}

.startup-splash__bar--two {
  --splash-fill: oklch(0.62 0.13 230);
}

.startup-splash__bar--three {
  --splash-fill: oklch(0.66 0.12 196);
}

.startup-splash__bar--four {
  --splash-fill: oklch(0.68 0.13 155);
}

.startup-splash__bar--five {
  --splash-fill: oklch(0.72 0.14 110);
}

.startup-splash__bar--six {
  --splash-fill: oklch(0.7 0.15 70);
}

.startup-splash__bar--seven {
  --splash-fill: oklch(0.62 0.18 35);
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

@keyframes startup-splash-bar {
  0%,
  100% {
    height: 24px;
    transform: translateY(0) scaleY(0.82);
  }
  45% {
    height: 84px;
    transform: translateY(-2px) scaleY(1);
  }
  62% {
    height: 56px;
    transform: translateY(0) scaleY(0.9);
  }
}

@keyframes startup-splash-drop {
  0%,
  38%,
  100% {
    opacity: 0;
    transform: translateY(12px) scale(0.6);
  }
  48%,
  58% {
    opacity: 1;
    transform: translateY(-2px) scale(1);
  }
}

@keyframes startup-splash-base {
  0%,
  100% {
    transform: scale(0.75);
    opacity: 0.55;
  }
  45% {
    transform: scale(1.12);
    opacity: 0.84;
  }
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
  .startup-splash__drop,
  .startup-splash__bar,
  .startup-splash__base {
    animation: none;
  }

  .startup-splash__bar {
    height: 56px;
  }

  .startup-splash__drop {
    opacity: 0.75;
    transform: none;
  }

  .startup-splash-leave-active {
    transition: opacity 160ms ease-out;
  }

  .startup-splash-leave-to {
    transform: none;
  }
}
</style>
