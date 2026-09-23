<script setup lang="ts">
defineProps<{
  volume: number
  isMuted: boolean
}>()
</script>

<template>
  <span v-if="isMuted || volume === 0" class="i-ri-volume-mute-line" aria-hidden="true" />
  <span v-else-if="volume < 0.5" class="i-ri-volume-down-line" aria-hidden="true" />
  <span v-else class="i-ri-volume-up-line" aria-hidden="true" />
</template>
