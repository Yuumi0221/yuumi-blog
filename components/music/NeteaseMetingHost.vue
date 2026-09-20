<script setup lang="ts">
import type { APlayerLike } from './useMusicPlayer'
import type { LyricLine } from './music'
import { useMeting } from 'valaxy-addon-meting/client/index.ts'
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface MetingElement extends HTMLElement {
  aplayer?: APlayerLike
}

const props = defineProps<{
  sourceId: string
  songId: string
  api?: string
}>()

const emit = defineEmits<{
  ready: [sourceId: string, player: APlayerLike]
  metadata: [sourceId: string, cover: string | null, lyrics: LyricLine[]]
  error: [sourceId: string, message: string]
}>()

useMeting()

const host = ref<MetingElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null
let timeoutTimer: ReturnType<typeof setTimeout> | null = null
let lyricTimer: ReturnType<typeof setInterval> | null = null
let lyricTimeoutTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (pollTimer)
    clearInterval(pollTimer)
  if (timeoutTimer)
    clearTimeout(timeoutTimer)
  if (lyricTimer)
    clearInterval(lyricTimer)
  if (lyricTimeoutTimer)
    clearTimeout(lyricTimeoutTimer)
  pollTimer = null
  timeoutTimer = null
  lyricTimer = null
  lyricTimeoutTimer = null
}

function observeMetadata(player: APlayerLike) {
  const playerList = player.list
  const track = playerList?.audios[playerList.index]
  emit('metadata', props.sourceId, track?.cover || null, [])

  lyricTimer = setInterval(() => {
    const current = player.lrc?.current || []
    const lyrics = current
      .filter((line): line is [number, string] => (
        Number.isFinite(line?.[0])
        && Boolean(line?.[1])
        && !['Loading', 'Not available'].includes(line[1])
      ))
      .map(([start, text]) => ({ start, text }))
    if (!lyrics.length)
      return

    if (lyricTimer)
      clearInterval(lyricTimer)
    lyricTimer = null
    emit('metadata', props.sourceId, track?.cover || null, lyrics)
  }, 200)

  lyricTimeoutTimer = setTimeout(() => {
    if (lyricTimer)
      clearInterval(lyricTimer)
    lyricTimer = null
  }, 12000)
}

onMounted(() => {
  pollTimer = setInterval(() => {
    if (!host.value?.aplayer)
      return

    const player = host.value.aplayer
    if (pollTimer)
      clearInterval(pollTimer)
    if (timeoutTimer)
      clearTimeout(timeoutTimer)
    pollTimer = null
    timeoutTimer = null
    emit('ready', props.sourceId, player)
    observeMetadata(player)
  }, 100)

  timeoutTimer = setTimeout(() => {
    clearTimers()
    emit('error', props.sourceId, '网易云音源解析超时，请使用外部平台链接。')
  }, 12000)
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <meting-js
    ref="host"
    class="music-meting-host"
    aria-hidden="true"
    server="netease"
    type="song"
    :id="songId"
    :api="api || undefined"
    preload="metadata"
    autoplay="false"
    mutex="true"
    lrc-type="3"
  />
</template>

<style scoped>
.music-meting-host {
  position: fixed;
  inset: auto auto 0 0;
  z-index: -1;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
