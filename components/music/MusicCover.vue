<script setup lang="ts">
import type { Song } from './music'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { resolveSongCover } from './useSongMetadata'

const props = defineProps<{
  song: Song
}>()

const image = ref<HTMLImageElement | null>(null)
const src = ref(props.song.thumbnail || props.song.cover)
let observer: IntersectionObserver | null = null

async function loadRemoteCover() {
  observer?.disconnect()
  observer = null
  src.value = await resolveSongCover(props.song)
}

onMounted(() => {
  if (!image.value || typeof IntersectionObserver === 'undefined') {
    void loadRemoteCover()
    return
  }

  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting))
      void loadRemoteCover()
  }, { rootMargin: '160px' })
  observer.observe(image.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <img
    ref="image"
    :src="src"
    :alt="`${song.title} 封面`"
    width="48"
    height="48"
    loading="lazy"
    decoding="async"
    referrerpolicy="no-referrer"
  >
</template>
