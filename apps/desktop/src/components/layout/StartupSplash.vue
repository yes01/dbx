<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const VIDEO_SRC = "/assets/startup/donghua.mp4";
const VIDEO_FADE_SECONDS = 0.5;
const VIDEO_ERROR_DISMISS_MS = 900;
const VIDEO_STALL_DISMISS_MS = 18_000;

const props = defineProps<{
  ready: boolean;
  exiting?: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const videoOpacity = ref(0);
const videoArmed = ref(false);
const contentVisible = ref(false);
const videoFailed = ref(false);

let animationFrame = 0;
let errorDismissTimer: ReturnType<typeof setTimeout> | undefined;
let stallDismissTimer: ReturnType<typeof setTimeout> | undefined;

const statusText = computed(() => {
  if (props.exiting) return "正在进入主界面";
  return props.ready ? "主界面已就绪" : "正在准备主界面";
});
const ariaLabel = computed(() => `DBX 启动动画。${statusText.value}。点击任意位置可跳过。`);

function requestDismiss() {
  if (props.exiting) return;
  emit("dismiss");
}

function clampOpacity(value: number) {
  return Math.max(0, Math.min(1, value));
}

function syncVideoOpacity() {
  const video = videoRef.value;
  if (!video || videoFailed.value) return;

  const duration = video.duration;
  if (Number.isFinite(duration) && duration > 0) {
    const fadeIn = video.currentTime / VIDEO_FADE_SECONDS;
    const fadeOut = (duration - video.currentTime) / VIDEO_FADE_SECONDS;
    videoOpacity.value = clampOpacity(Math.min(1, fadeIn, fadeOut));
    if (!contentVisible.value && videoOpacity.value >= 0.12) {
      contentVisible.value = true;
    }
  }

  animationFrame = requestAnimationFrame(syncVideoOpacity);
}

function playVideo() {
  const video = videoRef.value;
  if (!video || videoFailed.value) return;
  video.muted = true;
  video.playsInline = true;
  void video.play().catch(() => {
    onVideoError();
  });
}

function armVideo() {
  if (videoFailed.value) return;
  videoArmed.value = true;
  contentVisible.value = true;
  playVideo();
}

function completeVideo() {
  videoOpacity.value = 0;
  requestDismiss();
}

function onVideoError() {
  videoFailed.value = true;
  contentVisible.value = true;
  videoOpacity.value = 0;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (errorDismissTimer) clearTimeout(errorDismissTimer);
  errorDismissTimer = setTimeout(requestDismiss, VIDEO_ERROR_DISMISS_MS);
}

onMounted(() => {
  playVideo();
  animationFrame = requestAnimationFrame(syncVideoOpacity);
  stallDismissTimer = setTimeout(requestDismiss, VIDEO_STALL_DISMISS_MS);
});

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (errorDismissTimer) clearTimeout(errorDismissTimer);
  if (stallDismissTimer) clearTimeout(stallDismissTimer);
});
</script>

<template>
  <div
    class="startup-splash"
    :class="{ 'startup-splash--ready': ready, 'startup-splash--exiting': exiting, 'startup-splash--armed': videoArmed, 'startup-splash--content-visible': contentVisible, 'startup-splash--fallback': videoFailed }"
    role="button"
    tabindex="0"
    aria-live="polite"
    :aria-label="ariaLabel"
    @click="requestDismiss"
    @keydown.enter.prevent="requestDismiss"
    @keydown.space.prevent="requestDismiss"
  >
    <video ref="videoRef" class="startup-splash__video" :style="{ opacity: videoOpacity }" :src="VIDEO_SRC" muted playsinline preload="auto" @ended="completeVideo" @error="onVideoError" @loadeddata="armVideo" @canplay="armVideo" />
    <div class="startup-splash__overlay" aria-hidden="true" />

    <div class="startup-splash__content">
      <h1 class="startup-splash__title">DBX</h1>
      <p class="startup-splash__tagline">让数据醒来</p>
      <p class="startup-splash__enter">点击跳过</p>
      <span class="startup-splash__sr">{{ statusText }}</span>
    </div>
  </div>
</template>

<style scoped>
.startup-splash {
  position: fixed;
  inset: 0;
  z-index: 100000;
  overflow: hidden;
  background: #fff;
  color: #000;
  cursor: pointer;
  pointer-events: auto;
}

.startup-splash__video {
  position: absolute;
  inset: 300px 0 0;
  width: 100%;
  height: calc(100% - 300px);
  object-fit: cover;
  object-position: center center;
  transition: opacity 80ms linear;
  pointer-events: none;
}

.startup-splash__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(to bottom, #fff 0, #fff 300px, rgb(255 255 255 / 0) 390px), linear-gradient(to bottom, rgb(255 255 255 / 0) calc(100% - 150px), rgb(255 255 255 / 0.62) 100%);
  pointer-events: none;
}

.startup-splash--fallback .startup-splash__overlay {
  background: linear-gradient(180deg, #fff, #f7f7f7 48%, #fff);
}

.startup-splash__content {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(72px, 12vh, 124px) 24px 0;
  opacity: 0;
  text-align: center;
  transform: translateY(8px);
  transition:
    opacity 620ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 620ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 620ms cubic-bezier(0.16, 1, 0.3, 1);
}

.startup-splash--content-visible .startup-splash__content,
.startup-splash--fallback .startup-splash__content {
  opacity: 1;
  transform: translateY(0);
}

.startup-splash__title {
  margin: 0;
  color: #000;
  font-family: "Instrument Serif", Georgia, "Times New Roman", serif;
  font-size: clamp(5.5rem, 11vw, 10.5rem);
  font-weight: 400;
  letter-spacing: 0;
  line-height: 0.82;
}

.startup-splash__tagline {
  margin: 20px 0 0;
  color: rgb(0 0 0 / 0.78);
  font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
  font-size: clamp(1.45rem, 3.3vw, 3.2rem);
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.05;
}

.startup-splash__enter {
  min-height: 22px;
  margin: 22px 0 0;
  color: rgb(0 0 0 / 0.42);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.5;
}

.startup-splash__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.startup-splash--exiting {
  pointer-events: none;
}

.startup-splash--exiting .startup-splash__content {
  opacity: 0;
  transform: translateY(-10px);
  filter: blur(8px);
}

.startup-splash--exiting .startup-splash__video {
  opacity: 0 !important;
}

@media (width <= 720px) {
  .startup-splash__video {
    inset: 260px 0 0;
    height: calc(100% - 260px);
  }

  .startup-splash__overlay {
    background: linear-gradient(to bottom, #fff 0, #fff 260px, rgb(255 255 255 / 0) 340px), linear-gradient(to bottom, rgb(255 255 255 / 0) calc(100% - 120px), rgb(255 255 255 / 0.58) 100%);
  }

  .startup-splash__title {
    font-size: clamp(4.25rem, 22vw, 7rem);
  }

  .startup-splash__content {
    padding-top: 76px;
  }

  .startup-splash__tagline {
    margin-top: 18px;
    font-size: clamp(1.35rem, 7vw, 2.3rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .startup-splash__video {
    display: none;
  }

  .startup-splash__content,
  .startup-splash--exiting .startup-splash__content {
    transition: opacity 160ms ease-out;
    transform: none;
    filter: none;
  }
}
</style>
