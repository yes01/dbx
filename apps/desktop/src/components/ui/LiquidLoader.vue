<script setup lang="ts">
type LiquidColumn = {
  delay: string;
  color: string;
  glow: string;
  scale: string;
  drift: string;
  bubbleDelay: string;
};

const columns: LiquidColumn[] = [
  { delay: "0ms", color: "oklch(0.62 0.2 300)", glow: "oklch(0.66 0.24 300 / 48%)", scale: "0.86", drift: "-4px", bubbleDelay: "-120ms" },
  { delay: "140ms", color: "oklch(0.61 0.19 255)", glow: "oklch(0.64 0.22 255 / 46%)", scale: "0.98", drift: "-2px", bubbleDelay: "-420ms" },
  { delay: "280ms", color: "oklch(0.68 0.15 215)", glow: "oklch(0.7 0.18 215 / 45%)", scale: "1.08", drift: "1px", bubbleDelay: "-260ms" },
  { delay: "420ms", color: "oklch(0.72 0.15 165)", glow: "oklch(0.74 0.18 165 / 44%)", scale: "1.14", drift: "3px", bubbleDelay: "-560ms" },
  { delay: "560ms", color: "oklch(0.78 0.16 112)", glow: "oklch(0.8 0.18 112 / 40%)", scale: "1.02", drift: "2px", bubbleDelay: "-180ms" },
  { delay: "700ms", color: "oklch(0.75 0.17 68)", glow: "oklch(0.78 0.19 68 / 42%)", scale: "0.92", drift: "-1px", bubbleDelay: "-500ms" },
  { delay: "840ms", color: "oklch(0.66 0.2 35)", glow: "oklch(0.7 0.23 35 / 44%)", scale: "0.82", drift: "4px", bubbleDelay: "-320ms" },
];

function columnStyle(column: LiquidColumn) {
  return {
    "--liquid-delay": column.delay,
    "--liquid-color": column.color,
    "--liquid-glow": column.glow,
    "--liquid-scale": column.scale,
    "--liquid-drift": column.drift,
    "--liquid-bubble-delay": column.bubbleDelay,
  };
}
</script>

<template>
  <div class="liquid-loader" aria-hidden="true">
    <div v-for="(column, index) in columns" :key="index" class="liquid-loader__column" :style="columnStyle(column)">
      <span class="liquid-loader__drop" />
      <span class="liquid-loader__bar">
        <span class="liquid-loader__surface" />
        <span class="liquid-loader__wave liquid-loader__wave--back" />
        <span class="liquid-loader__wave liquid-loader__wave--front" />
        <span class="liquid-loader__shine" />
        <span class="liquid-loader__bubble liquid-loader__bubble--one" />
        <span class="liquid-loader__bubble liquid-loader__bubble--two" />
      </span>
      <span class="liquid-loader__base" />
    </div>
  </div>
</template>

<style scoped>
.liquid-loader {
  display: flex;
  height: 132px;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  padding: 12px 14px 8px;
  contain: layout paint;
}

.liquid-loader__column {
  --liquid-delay: 0ms;
  --liquid-color: var(--primary);
  --liquid-glow: color-mix(in oklch, var(--primary) 40%, transparent);
  --liquid-scale: 1;
  --liquid-drift: 0px;
  --liquid-bubble-delay: 0ms;
  position: relative;
  display: flex;
  width: 18px;
  height: 112px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  transform: translateX(var(--liquid-drift));
}

.liquid-loader__drop,
.liquid-loader__bar,
.liquid-loader__base {
  display: block;
  background: var(--liquid-color);
  box-shadow:
    0 0 18px var(--liquid-glow),
    0 0 42px color-mix(in oklch, var(--liquid-color) 18%, transparent);
}

.liquid-loader__drop {
  position: absolute;
  top: 0;
  width: 12px;
  height: 12px;
  border-radius: 999px 999px 999px 40%;
  filter: blur(0.15px);
  opacity: 0;
  transform: translateY(26px) rotate(45deg) scale(0.54);
  animation: liquid-loader-drop 2.35s var(--liquid-delay) cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.liquid-loader__bar {
  position: relative;
  width: 15px;
  height: calc(78px * var(--liquid-scale));
  overflow: hidden;
  border-radius: 999px;
  filter: saturate(1.08);
  transform: translateY(6px) scaleY(0.28);
  transform-origin: bottom center;
  animation: liquid-loader-rise 2.35s var(--liquid-delay) cubic-bezier(0.2, 0.9, 0.18, 1) infinite;
  will-change: transform, border-radius;
}

.liquid-loader__bar::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.42),
    inset 0 -16px 26px rgb(0 0 0 / 0.18);
  pointer-events: none;
}

.liquid-loader__surface {
  position: absolute;
  top: -1px;
  right: -2px;
  left: -2px;
  height: 18px;
  border-radius: 999px 999px 72% 72%;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.62), rgb(255 255 255 / 0.16) 62%, transparent);
  mix-blend-mode: screen;
  transform-origin: center top;
  animation: liquid-loader-surface 2.35s var(--liquid-delay) ease-in-out infinite;
}

.liquid-loader__wave {
  position: absolute;
  inset: 0 -10px;
  border-radius: inherit;
  opacity: 0.46;
  mix-blend-mode: screen;
  transform: translateY(8px);
  animation: liquid-loader-wave 2.35s var(--liquid-delay) ease-in-out infinite;
}

.liquid-loader__wave--back {
  background: radial-gradient(24px 18px at 35% 12%, rgb(255 255 255 / 0.36), transparent 62%);
}

.liquid-loader__wave--front {
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.38), transparent);
  opacity: 0.34;
  animation-name: liquid-loader-shimmer;
}

.liquid-loader__shine {
  position: absolute;
  top: 9px;
  bottom: 15px;
  left: 3px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.46), rgb(255 255 255 / 0.04));
  opacity: 0.54;
  transform: translateY(16px);
  animation: liquid-loader-shine 2.35s var(--liquid-delay) ease-in-out infinite;
}

.liquid-loader__bubble {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.46);
  opacity: 0;
  animation: liquid-loader-bubble 2.35s calc(var(--liquid-delay) + var(--liquid-bubble-delay)) ease-in-out infinite;
}

.liquid-loader__bubble--one {
  right: 4px;
  bottom: 14px;
}

.liquid-loader__bubble--two {
  bottom: 28px;
  left: 4px;
  width: 3px;
  height: 3px;
  animation-delay: calc(var(--liquid-delay) + var(--liquid-bubble-delay) + 260ms);
}

.liquid-loader__base {
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 999px;
  opacity: 0.72;
  transform: scale(0.8);
  animation: liquid-loader-base 2.35s var(--liquid-delay) ease-in-out infinite;
}

@keyframes liquid-loader-rise {
  0%,
  100% {
    border-radius: 999px;
    transform: translateY(8px) scaleY(0.26);
  }
  30% {
    border-radius: 999px 999px 44% 44%;
    transform: translateY(-2px) scaleY(0.88);
  }
  44% {
    border-radius: 999px 999px 54% 54%;
    transform: translateY(-8px) scaleY(1);
  }
  58% {
    border-radius: 56% 56% 999px 999px;
    transform: translateY(1px) scaleY(0.58);
  }
  74% {
    border-radius: 999px 999px 62% 62%;
    transform: translateY(-3px) scaleY(0.76);
  }
}

@keyframes liquid-loader-drop {
  0%,
  34%,
  100% {
    opacity: 0;
    transform: translateY(28px) rotate(45deg) scale(0.5);
  }
  44% {
    opacity: 0.96;
    transform: translateY(3px) rotate(45deg) scale(0.9);
  }
  56% {
    opacity: 0.82;
    transform: translateY(-6px) rotate(45deg) scale(1.08);
  }
  66% {
    opacity: 0;
    transform: translateY(12px) rotate(45deg) scale(0.72);
  }
}

@keyframes liquid-loader-surface {
  0%,
  100% {
    transform: translateY(3px) scaleX(0.84) scaleY(0.7);
  }
  36% {
    transform: translateY(-1px) scaleX(1.16) scaleY(1.08);
  }
  56% {
    transform: translateY(2px) scaleX(0.92) scaleY(0.82);
  }
  74% {
    transform: translateY(0) scaleX(1.06) scaleY(0.94);
  }
}

@keyframes liquid-loader-wave {
  0%,
  100% {
    transform: translate(-8px, 12px) rotate(-5deg);
  }
  45% {
    transform: translate(5px, -2px) rotate(4deg);
  }
  70% {
    transform: translate(-2px, 5px) rotate(-2deg);
  }
}

@keyframes liquid-loader-shimmer {
  0%,
  100% {
    transform: translateX(-14px);
  }
  46% {
    transform: translateX(8px);
  }
  74% {
    transform: translateX(2px);
  }
}

@keyframes liquid-loader-shine {
  0%,
  100% {
    opacity: 0.36;
    transform: translateY(20px) scaleY(0.54);
  }
  45% {
    opacity: 0.72;
    transform: translateY(0) scaleY(1);
  }
  70% {
    opacity: 0.52;
    transform: translateY(8px) scaleY(0.72);
  }
}

@keyframes liquid-loader-bubble {
  0%,
  35%,
  100% {
    opacity: 0;
    transform: translateY(10px) scale(0.55);
  }
  52% {
    opacity: 0.72;
    transform: translateY(-10px) scale(1);
  }
  72% {
    opacity: 0;
    transform: translateY(-24px) scale(0.65);
  }
}

@keyframes liquid-loader-base {
  0%,
  100% {
    opacity: 0.5;
    transform: translateY(1px) scale(0.72);
  }
  44% {
    opacity: 0.86;
    transform: translateY(0) scale(1.15);
  }
  64% {
    opacity: 0.62;
    transform: translateY(-1px) scale(0.88);
  }
}

@media (prefers-reduced-motion: reduce) {
  .liquid-loader__drop,
  .liquid-loader__bar,
  .liquid-loader__surface,
  .liquid-loader__wave,
  .liquid-loader__shine,
  .liquid-loader__bubble,
  .liquid-loader__base {
    animation: none;
  }

  .liquid-loader__drop {
    opacity: 0.72;
    transform: translateY(6px) rotate(45deg) scale(0.85);
  }

  .liquid-loader__bar {
    transform: scaleY(0.72);
  }

  .liquid-loader__bubble {
    opacity: 0.42;
  }
}
</style>
