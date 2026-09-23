<script setup lang="ts">
import type { PlaybackMode } from './useGlobalMusicPlayer'

defineProps<{
  mode: PlaybackMode
  maskId: string
}>()
</script>

<template>
  <svg
    v-if="mode === 'list' || mode === 'stop'"
    class="mode-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <defs v-if="mode === 'stop'">
      <mask :id="maskId">
        <rect width="24" height="24" fill="white" />
        <path d="M3 1 23 21" stroke="black" stroke-width="3" stroke-linecap="butt" />
      </mask>
    </defs>
    <path
      fill="currentColor"
      :mask="mode === 'stop' ? `url(#${maskId})` : undefined"
      d="M8 20v1.932a.5.5 0 0 1-.82.385l-4.12-3.433A.5.5 0 0 1 3.382 18H18a2 2 0 0 0 2-2V8h2v8a4 4 0 0 1-4 4zm8-16V2.068a.5.5 0 0 1 .82-.385l4.12 3.433a.5.5 0 0 1-.321.884H6a2 2 0 0 0-2 2v8H2V8a4 4 0 0 1 4-4z"
    />
    <path
      v-if="mode === 'stop'"
      d="M2 2 22 22"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="butt"
    />
  </svg>
  <span v-else :class="mode === 'one' ? 'i-ri-repeat-one-line' : 'i-ri-shuffle-line'" aria-hidden="true" />
</template>

<style scoped>
.mode-icon {
  width: 1.3rem;
  height: 1.3rem;
}
</style>
