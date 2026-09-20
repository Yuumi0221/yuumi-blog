<script setup lang="ts">
import type { APlayerLike } from './useMusicPlayer'
import { onBeforeUnmount, onMounted } from 'vue'

interface GlobalMetingElement extends HTMLElement {
  aplayer?: APlayerLike
}

const emit = defineEmits<{
  ready: [player: APlayerLike]
}>()

let pollTimer: ReturnType<typeof setInterval> | null = null
let timeoutTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (pollTimer)
    clearInterval(pollTimer)
  if (timeoutTimer)
    clearTimeout(timeoutTimer)
  pollTimer = null
  timeoutTimer = null
}

function prepareGlobalHost() {
  const host = document.querySelector<GlobalMetingElement>('meting-js[fixed]')
  // Keep the host explicit before MetingJS upgrades the custom element.
  if (host?.getAttribute('fixed') !== 'true')
    host?.setAttribute('fixed', 'true')
  return host
}

onMounted(() => {
  prepareGlobalHost()
  pollTimer = setInterval(() => {
    const host = prepareGlobalHost()
    if (!host?.aplayer)
      return
    clearTimers()
    emit('ready', host.aplayer)
  }, 100)

  timeoutTimer = setTimeout(clearTimers, 15000)
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <span class="global-meting-bridge" aria-hidden="true" />
</template>

<style scoped>
.global-meting-bridge {
  display: none;
}
</style>
