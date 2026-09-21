<script setup lang="ts">
import type { Song } from './music'
import { getSongCoverUrl, handleSongCoverError } from './covers'

defineProps<{
  song: Song
}>()
</script>

<template>
  <img
    :src="getSongCoverUrl(song, 'thumb')"
    :alt="`${song.title} 封面`"
    width="48"
    height="48"
    loading="lazy"
    decoding="async"
    referrerpolicy="no-referrer"
    @error="handleSongCoverError"
  >
</template>
