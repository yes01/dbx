<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const VIDEO_SRC = "/assets/startup/donghua.mp4";
const VIDEO_ERROR_DISMISS_MS = 900;
const VIDEO_STALL_DISMISS_MS = 18_000;

const emit = defineEmits<{
  dismiss: [];
}>();

const videoRef = ref<HTMLVideoElement | null>(null);

let errorDismissTimer: ReturnType<typeof setTimeout> | undefined;
let stallDismissTimer: ReturnType<typeof setTimeout> | undefined;
let dismissed = false;

function requestDismiss() {
  if (dismissed) return;
  dismissed = true;
  emit("dismiss");
}

function playVideo() {
  const video = videoRef.value;
  if (!video) return;
  video.muted = true;
  video.playsInline = true;
  void video.play().catch(() => {
    onVideoError();
  });
}

function onVideoError() {
  if (errorDismissTimer) clearTimeout(errorDismissTimer);
  errorDismissTimer = setTimeout(requestDismiss, VIDEO_ERROR_DISMISS_MS);
}

onMounted(() => {
  playVideo();
  stallDismissTimer = setTimeout(requestDismiss, VIDEO_STALL_DISMISS_MS);
});

onUnmounted(() => {
  if (errorDismissTimer) clearTimeout(errorDismissTimer);
  if (stallDismissTimer) clearTimeout(stallDismissTimer);
});
</script>

<template>
  <div class="startup-splash" role="button" tabindex="0" aria-label="DBX 启动视频，点击任意位置可跳过。" @click="requestDismiss" @keydown.enter.prevent="requestDismiss" @keydown.space.prevent="requestDismiss">
    <video ref="videoRef" class="startup-splash__video" :src="VIDEO_SRC" muted playsinline autoplay preload="auto" @ended="requestDismiss" @error="onVideoError" @canplay="playVideo" />
  </div>
</template>

<style scoped>
.startup-splash {
  position: fixed;
  inset: 0;
  z-index: 100000;
  overflow: hidden;
  background: #000;
  cursor: pointer;
  pointer-events: auto;
}

.startup-splash__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
}
</style>
