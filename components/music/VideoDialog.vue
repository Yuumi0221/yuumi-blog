<script setup lang="ts">
import type { SongVideo } from './music'
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  videos: SongVideo[]
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const activeIndex = ref(0)

function releaseVideo() {
  if (!video.value)
    return
  video.value.pause()
  video.value.removeAttribute('src')
  video.value.load()
}

function requestClose() {
  releaseVideo()
  emit('close')
}

function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value)
    requestClose()
}

watch(() => props.open, async (open) => {
  await nextTick()
  if (open) {
    activeIndex.value = 0
    if (dialog.value && !dialog.value.open)
      dialog.value.showModal()
  }
  else {
    releaseVideo()
    if (dialog.value?.open)
      dialog.value.close()
  }
})

watch(activeIndex, releaseVideo)
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="video-dialog"
      aria-labelledby="music-video-title"
      @cancel.prevent="requestClose"
      @click="onBackdrop"
    >
      <div class="video-dialog__card">
        <header>
          <div>
            <p>VIDEO ARCHIVE</p>
            <h2 id="music-video-title">{{ title }}</h2>
          </div>
          <button type="button" aria-label="关闭视频" @click="requestClose">
            <span class="i-ri-close-line" aria-hidden="true" />
          </button>
        </header>

        <div v-if="videos.length > 1" class="video-tabs" aria-label="视频版本">
          <button
            v-for="(item, index) in videos"
            :key="item.src"
            type="button"
            :class="{ active: activeIndex === index }"
            @click="activeIndex = index"
          >
            {{ item.title }}
          </button>
        </div>

        <video
          v-if="open && videos[activeIndex]"
          ref="video"
          :src="videos[activeIndex].src"
          :poster="videos[activeIndex].poster"
          controls
          controlsList="nodownload"
          preload="metadata"
          playsinline
        >
          你的浏览器不支持视频播放。
        </video>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.video-dialog {
  position: fixed;
  inset: 0;
  width: min(92vw, 66rem);
  max-width: none;
  max-height: calc(100dvh - 2rem);
  margin: auto;
  border: 1px solid var(--va-c-divider);
  border-radius: 1rem;
  padding: 0;
  color: var(--va-c-text);
  background: var(--va-c-bg);
  box-shadow: 0 2rem 6rem rgb(0 0 0 / 0.35);
}

.video-dialog::backdrop {
  background: rgb(0 0 0 / 0.68);
  backdrop-filter: blur(8px);
}

.video-dialog__card {
  padding: 1rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

header p {
  margin: 0;
  color: var(--va-c-primary);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

header h2 {
  margin: 0.2rem 0 0;
  font-size: 1.15rem;
}

header button {
  display: grid;
  width: 2.65rem;
  height: 2.65rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--va-c-divider);
  border-radius: 50%;
  color: var(--va-c-text);
  background: var(--va-c-bg-soft);
  font-size: 1.3rem;
  cursor: pointer;
}

.video-tabs {
  display: flex;
  gap: 0.45rem;
  margin-bottom: 0.7rem;
  overflow-x: auto;
}

.video-tabs button {
  flex: none;
  border: 1px solid var(--va-c-divider);
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  color: var(--va-c-text-2);
  background: transparent;
  cursor: pointer;
}

.video-tabs button.active {
  border-color: var(--va-c-primary);
  color: var(--va-c-primary);
}

video {
  display: block;
  width: 100%;
  max-height: 76vh;
  border-radius: 0.7rem;
  background: black;
}

@media (width < 640px) {
  .video-dialog {
    width: calc(100vw - 1rem);
    border-radius: 0.8rem;
  }

  .video-dialog__card {
    padding: 0.75rem;
  }
}
</style>
