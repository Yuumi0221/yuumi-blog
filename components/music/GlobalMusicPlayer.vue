<script setup lang="ts">
import type { PlayableTrack, SongVersion } from './music'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { MUSIC_COVER_PLACEHOLDER, handleSongCoverError } from './covers'
import { useGlobalMusicPlayer } from './useGlobalMusicPlayer'
import { useSongMetadata } from './useSongMetadata'

const player = useGlobalMusicPlayer()
const audioElement = ref<HTMLAudioElement | null>(null)
const playerRoot = ref<HTMLElement | null>(null)
const isQueueOpen = ref(false)
const titleMarquee = ref<HTMLElement | null>(null)
const artistMarquee = ref<HTMLElement | null>(null)
const lyricMarquee = ref<HTMLElement | null>(null)
const titleOverflows = ref(false)
const artistOverflows = ref(false)
const lyricOverflows = ref(false)
const metadataTrack = computed<PlayableTrack | null>(() => player.currentTrack.value)
const metadataVersion = computed<SongVersion | null>(() => player.currentVersion.value)
const metadata = useSongMetadata(metadataTrack, metadataVersion, player.currentTime)
const currentLyric = metadata.currentLyric

const title = computed(() => {
  const track = player.currentTrack.value
  if (!track)
    return ''
  return track.preferRemoteMetadata ? (metadata.metadata.value.title || track.title) : track.title
})

const artist = computed(() => {
  const track = player.currentTrack.value
  if (!track)
    return ''
  const fallback = track.artists.join(' / ')
  return track.preferRemoteMetadata ? (metadata.metadata.value.artist || fallback) : fallback
})

const cover = computed(() => {
  const track = player.currentTrack.value
  if (!track)
    return MUSIC_COVER_PLACEHOLDER
  return track.preferRemoteMetadata
    ? (metadata.metadata.value.cover || track.cover || MUSIC_COVER_PLACEHOLDER)
    : (track.cover || metadata.metadata.value.cover || MUSIC_COVER_PLACEHOLDER)
})

const progressPercent = computed(() => player.duration.value > 0
  ? Math.min(100, Math.max(0, (player.currentTime.value / player.duration.value) * 100))
  : 0)

const modeMeta = computed(() => ({
  list: { label: '列表循环', icon: 'i-ri-repeat-2-line' },
  one: { label: '单曲循环', icon: 'i-ri-repeat-one-line' },
  random: { label: '随机播放', icon: 'i-ri-shuffle-line' },
  stop: { label: '播完停止', icon: 'i-ri-stop-circle-line' },
})[player.playbackMode.value])

const volumeIcon = computed(() => {
  if (player.isMuted.value || player.volume.value === 0)
    return 'i-ri-volume-mute-line'
  if (player.volume.value < 0.5)
    return 'i-ri-volume-down-line'
  return 'i-ri-volume-up-line'
})

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0)
    return '0:00'
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

function onSeek(event: Event) {
  player.seek(Number((event.target as HTMLInputElement).value))
}

function onVolume(event: Event) {
  player.setVolume(Number((event.target as HTMLInputElement).value))
}

function onTogglePlayback(event: MouseEvent) {
  player.togglePlayback()
  if (event.detail > 0)
    (event.currentTarget as HTMLButtonElement).blur()
}

function textOverflowDistance(container: HTMLElement | null) {
  const text = container?.querySelector<HTMLElement>('.marquee-text')
  if (!container || !text)
    return 0
  const textPadding = Number.parseFloat(getComputedStyle(text).paddingRight) || 0
  const containerStyle = getComputedStyle(container)
  const availableWidth = container.clientWidth
    - (Number.parseFloat(containerStyle.paddingLeft) || 0)
    - (Number.parseFloat(containerStyle.paddingRight) || 0)
  return Math.max(0, text.scrollWidth - textPadding - availableWidth)
}

function updateMarquees() {
  titleOverflows.value = textOverflowDistance(titleMarquee.value) > 1
  artistOverflows.value = textOverflowDistance(artistMarquee.value) > 1
  const lyricDistance = textOverflowDistance(lyricMarquee.value)
  lyricOverflows.value = lyricDistance > 1
  lyricMarquee.value?.style.setProperty('--lyric-scroll-distance', `${-lyricDistance}px`)
  lyricMarquee.value?.style.setProperty('--lyric-scroll-duration', `${Math.max(6, lyricDistance / 20)}s`)
}

function scheduleMarqueeUpdate() {
  void nextTick(updateMarquees)
}

function playQueueTrack(index: number) {
  isQueueOpen.value = false
  player.playQueueTrack(index)
}

function collapsePlayer() {
  isQueueOpen.value = false
  player.toggleCollapsed()
}

function closeQueueOutside(event: PointerEvent) {
  const target = event.target
  if (isQueueOpen.value && target instanceof Node && !playerRoot.value?.contains(target))
    isQueueOpen.value = false
}

let stopMediaWatch: (() => void) | null = null
let stopRootWatch: (() => void) | null = null
let stopMarqueeWatch: (() => void) | null = null

onMounted(() => {
  player.attachAudio(audioElement.value)
  window.addEventListener('resize', scheduleMarqueeUpdate)
  document.addEventListener('pointerdown', closeQueueOutside)
  stopMarqueeWatch = watchEffect(() => {
    title.value
    artist.value
    currentLyric.value
    player.isCollapsed.value
    scheduleMarqueeUpdate()
  })
  stopRootWatch = watchEffect(() => {
    document.documentElement.classList.toggle('yuumi-global-player-active', player.hasTrack.value)
  })
  if (!('mediaSession' in navigator))
    return

  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ['play', () => {
      if (!player.isPlaying.value)
        player.togglePlayback()
    }],
    ['pause', () => {
      if (player.isPlaying.value)
        player.togglePlayback()
    }],
    ['previoustrack', () => player.goPrevious()],
    ['nexttrack', () => player.goNext()],
  ]
  for (const [action, handler] of handlers) {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    }
    catch {
      // Browsers expose different subsets of the Media Session actions.
    }
  }

  stopMediaWatch = watchEffect(() => {
    if (!player.currentTrack.value)
      return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title.value,
      artist: artist.value,
      album: player.currentVersion.value?.label || '',
      artwork: cover.value.startsWith('data:') ? [] : [{ src: cover.value }],
    })
    navigator.mediaSession.playbackState = player.isPlaying.value ? 'playing' : 'paused'
    if (player.duration.value > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: player.duration.value,
          playbackRate: audioElement.value?.playbackRate || 1,
          position: Math.min(player.currentTime.value, player.duration.value),
        })
      }
      catch {
        // Position state is optional.
      }
    }
  })
})

onBeforeUnmount(() => {
  stopMediaWatch?.()
  stopRootWatch?.()
  stopMarqueeWatch?.()
  window.removeEventListener('resize', scheduleMarqueeUpdate)
  document.removeEventListener('pointerdown', closeQueueOutside)
  document.documentElement.classList.remove('yuumi-global-player-active')
  player.attachAudio(null)
})
</script>

<template>
  <audio
    ref="audioElement"
    preload="metadata"
    class="player-audio"
    @loadedmetadata="player.onLoadedMetadata"
    @canplay="player.onCanPlay"
    @timeupdate="player.onTimeUpdate"
    @play="player.onPlay"
    @pause="player.onPause"
    @waiting="player.onWaiting"
    @stalled="player.onWaiting"
    @error="player.onAudioError"
    @ended="player.onEnded"
  />

  <aside
    v-if="player.hasTrack.value"
    ref="playerRoot"
    class="global-music-player"
    :class="{ collapsed: player.isCollapsed.value, paused: !player.isPlaying.value }"
    aria-label="全站音乐播放器"
  >
    <template v-if="player.isCollapsed.value">
      <img :src="cover" :alt="`${title} 封面`" @error="handleSongCoverError">
      <div class="collapsed-transport">
        <button type="button" class="round-control collapsed-main-control" aria-label="下一首" @click="player.goNext()">
          <span class="i-ri-skip-forward-fill" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="round-control primary-control collapsed-main-control"
          :aria-label="player.isPlaying.value ? '暂停' : '播放'"
          :aria-pressed="player.isPlaying.value"
          @click="onTogglePlayback"
        >
          <span v-if="player.isLoading.value" class="i-ri-loader-4-line spin" aria-hidden="true" />
          <span v-else :class="player.isPlaying.value ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
        </button>
      </div>
      <button type="button" class="expand-control" aria-label="展开播放器" @click="player.toggleCollapsed">
        <span class="i-ri-arrow-right-s-line" aria-hidden="true" />
      </button>
    </template>

    <template v-else>
      <div class="track-summary">
        <img :src="cover" :alt="`${title} 封面`" @error="handleSongCoverError">
        <div>
          <div ref="titleMarquee" class="marquee" :class="{ 'is-scrolling': titleOverflows }">
            <div :key="title" class="marquee-track">
              <strong class="marquee-text">{{ title }}</strong>
              <strong class="marquee-text marquee-copy" aria-hidden="true">{{ title }}</strong>
            </div>
          </div>
          <div ref="artistMarquee" class="marquee" :class="{ 'is-scrolling': artistOverflows }">
            <div :key="artist" class="marquee-track">
              <span class="marquee-text">{{ artist }}</span>
              <span class="marquee-text marquee-copy" aria-hidden="true">{{ artist }}</span>
            </div>
          </div>
          <div
            v-if="player.currentTrack.value && player.currentTrack.value.versions.length > 1"
            class="global-version-picker"
            aria-label="歌曲版本"
          >
            <button
              v-for="(item, index) in player.currentTrack.value.versions"
              :key="item.id"
              type="button"
              :class="{ active: player.currentVersionIndex.value === index }"
              :aria-pressed="player.currentVersionIndex.value === index"
              @click="player.selectVersion(index)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="transport">
        <div class="transport-display">
          <div
            ref="lyricMarquee"
            class="current-lyric marquee"
            :class="{ 'is-scrolling': lyricOverflows }"
            aria-live="polite"
          >
            <div :key="currentLyric" class="marquee-track">
              <span class="marquee-text">{{ currentLyric }}</span>
              <span class="marquee-text marquee-copy" aria-hidden="true">{{ currentLyric }}</span>
            </div>
          </div>
          <div class="transport-buttons">
            <button type="button" class="round-control mode-control" :aria-label="modeMeta.label" @click="player.cyclePlaybackMode">
              <svg
                v-if="player.playbackMode.value === 'list' || player.playbackMode.value === 'stop'"
                class="mode-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <defs v-if="player.playbackMode.value === 'stop'">
                  <mask id="global-music-stop-slash-mask">
                    <rect width="24" height="24" fill="white" />
                    <path d="M3 1 23 21" stroke="black" stroke-width="3" stroke-linecap="butt" />
                  </mask>
                </defs>
                <path
                  fill="currentColor"
                  :mask="player.playbackMode.value === 'stop' ? 'url(#global-music-stop-slash-mask)' : undefined"
                  d="M8 20v1.932a.5.5 0 0 1-.82.385l-4.12-3.433A.5.5 0 0 1 3.382 18H18a2 2 0 0 0 2-2V8h2v8a4 4 0 0 1-4 4zm8-16V2.068a.5.5 0 0 1 .82-.385l4.12 3.433a.5.5 0 0 1-.321.884H6a2 2 0 0 0-2 2v8H2V8a4 4 0 0 1 4-4z"
                />
                <path
                  v-if="player.playbackMode.value === 'stop'"
                  d="M2 2 22 22"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="butt"
                />
              </svg>
              <span v-else :class="modeMeta.icon" aria-hidden="true" />
            </button>
            <button type="button" class="round-control" aria-label="上一首" @click="player.goPrevious">
              <span class="i-ri-skip-back-fill" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="round-control primary-control"
              :aria-label="player.isPlaying.value ? '暂停' : '播放'"
              :aria-pressed="player.isPlaying.value"
              @click="onTogglePlayback"
            >
              <span v-if="player.isLoading.value" class="i-ri-loader-4-line spin" aria-hidden="true" />
              <span v-else :class="player.isPlaying.value ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
            </button>
            <button type="button" class="round-control" aria-label="下一首" @click="player.goNext()">
              <span class="i-ri-skip-forward-fill" aria-hidden="true" />
            </button>
            <div class="volume-control">
              <button
                type="button"
                class="round-control"
                :aria-label="player.isMuted.value ? '取消静音' : '静音'"
                :aria-pressed="player.isMuted.value"
                @click="player.toggleMute"
              >
                <span :class="volumeIcon" aria-hidden="true" />
              </button>
              <div class="volume-popover">
                <input
                  class="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="player.volume.value"
                  :style="{ '--music-volume': `${player.volume.value * 100}%` }"
                  aria-label="音量"
                  @input="onVolume"
                >
                <span>{{ Math.round(player.volume.value * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="timeline">
          <span>{{ formatTime(player.currentTime.value) }}</span>
          <input
            type="range"
            min="0"
            :max="Math.max(player.duration.value, 0)"
            step="0.1"
            :value="Math.min(player.currentTime.value, player.duration.value || 0)"
            :style="{ '--music-progress': `${progressPercent}%` }"
            aria-label="播放进度"
            @input="onSeek"
          >
          <span>{{ formatTime(player.duration.value) }}</span>
        </div>
        <p v-if="player.error.value" class="player-error" role="status">{{ player.error.value }}</p>
      </div>

      <div class="secondary-controls">
        <div class="queue-control">
          <button
            type="button"
            class="round-control"
            aria-label="播放列表"
            aria-controls="global-music-queue"
            :aria-expanded="isQueueOpen"
            @click="isQueueOpen = !isQueueOpen"
          >
            <span class="i-ri-play-list-2-line" aria-hidden="true" />
          </button>
          <div v-if="isQueueOpen" id="global-music-queue" class="queue-popover">
            <strong>播放列表</strong>
            <button
              v-for="(item, index) in player.queue.value"
              :key="`${item.id}-${index}`"
              type="button"
              class="queue-item"
              :class="{ active: index === player.currentIndex.value }"
              :aria-current="index === player.currentIndex.value ? 'true' : undefined"
              @click="playQueueTrack(index)"
            >
              <img
                :src="item.cover || MUSIC_COVER_PLACEHOLDER"
                :alt="`${item.title} 封面`"
                loading="lazy"
                @error="handleSongCoverError"
              >
              <span class="queue-item__copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.artists.join(' / ') }}</small>
              </span>
            </button>
          </div>
        </div>
        <button type="button" class="round-control" aria-label="收起播放器" @click="collapsePlayer">
          <span class="i-ri-arrow-left-s-line" aria-hidden="true" />
        </button>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.player-audio {
  display: none;
}

.global-music-player {
  --player-border: color-mix(in srgb, var(--va-c-text) 14%, transparent);
  --player-surface: color-mix(in srgb, var(--va-c-bg) 92%, var(--va-c-bg-soft));
  position: fixed;
  z-index: 80;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: max(1rem, env(safe-area-inset-left));
  display: grid;
  width: min(68rem, calc(100vw - 2rem));
  min-height: 5rem;
  grid-template-columns: minmax(12rem, 1fr) minmax(18rem, 2fr) minmax(7.5rem, 0.7fr);
  align-items: center;
  gap: 1rem;
  margin: auto;
  border: 1px solid var(--player-border);
  border-radius: 1rem;
  padding: 0.7rem 0.85rem;
  color: var(--va-c-text);
  background: var(--player-surface);
  box-shadow: 0 1rem 3rem rgb(0 0 0 / 0.2);
  backdrop-filter: blur(22px) saturate(1.2);
}

.track-summary {
  display: grid;
  min-width: 0;
  grid-template-columns: 3.35rem minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.global-music-player:not(.collapsed) .track-summary,
.global-music-player:not(.collapsed) .secondary-controls {
  align-self: center;
}

.track-summary img,
.global-music-player.collapsed > img {
  width: 3.35rem;
  height: 3.35rem;
  border-radius: 0.7rem;
  object-fit: cover;
  background: var(--va-c-bg-soft);
}

.track-summary > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.track-summary strong,
.track-summary span {
  white-space: nowrap;
}

.marquee {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.marquee-track {
  display: flex;
  width: max-content;
}

.marquee-text {
  display: block;
  flex: 0 0 auto;
}

.marquee-copy {
  display: none;
}

.marquee.is-scrolling .marquee-track {
  animation: marquee-scroll 18s linear 1s infinite;
}

.marquee.is-scrolling .marquee-text {
  padding-right: 2rem;
}

.marquee.is-scrolling .marquee-copy {
  display: block;
}

.track-summary strong {
  font-size: 0.88rem;
}

.track-summary span {
  color: var(--va-c-text-2);
  font-size: 0.7rem;
}

.global-version-picker {
  display: flex;
  gap: 0.24rem;
  margin-top: 0.16rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.global-version-picker::-webkit-scrollbar {
  display: none;
}

.global-version-picker button {
  flex: 0 0 auto;
  border: 1px solid var(--player-border);
  border-radius: 999px;
  padding: 0.08rem 0.35rem;
  color: var(--va-c-text-2);
  background: transparent;
  font: inherit;
  font-size: 0.58rem;
  cursor: pointer;
}

.global-version-picker button.active,
.global-version-picker button:hover,
.global-version-picker button:focus-visible {
  border-color: rgb(var(--va-c-primary-rgb), 0.45);
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.1);
  outline: none;
}

.transport {
  position: relative;
  min-width: 0;
}

.transport-display {
  display: grid;
  min-width: 0;
  min-height: 2.25rem;
  align-items: center;
}

.current-lyric {
  grid-area: 1 / 1;
  min-width: 0;
  margin: 0;
  padding: 0 0.35rem;
  text-align: center;
  color: var(--va-c-text-2);
  font-size: 0.72rem;
  line-height: 1.4;
  opacity: 1;
  visibility: visible;
  transition: opacity 150ms ease;
}

.current-lyric:not(.is-scrolling) .marquee-track {
  width: 100%;
  justify-content: center;
}

.current-lyric.is-scrolling .marquee-track {
  animation: lyric-scroll var(--lyric-scroll-duration, 8s) linear 1s 1 forwards;
}

.current-lyric.is-scrolling .marquee-text {
  padding-right: 0;
}

.current-lyric.is-scrolling .marquee-copy {
  display: none;
}

.transport-buttons,
.secondary-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.transport-buttons {
  grid-area: 1 / 1;
  gap: 0.25rem;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition: opacity 150ms ease;
}

.global-music-player:not(.collapsed).paused .current-lyric,
.global-music-player:not(.collapsed):hover .current-lyric,
.global-music-player:not(.collapsed):focus-within .current-lyric {
  opacity: 0;
  visibility: hidden;
}

.global-music-player:not(.collapsed).paused .transport-buttons,
.global-music-player:not(.collapsed):hover .transport-buttons,
.global-music-player:not(.collapsed):focus-within .transport-buttons {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

.round-control,
.expand-control {
  display: inline-grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  color: var(--va-c-text-2);
  background: transparent;
  cursor: pointer;
}

.mode-icon {
  width: 1.3rem;
  height: 1.3rem;
}

.round-control:hover,
.round-control:focus-visible,
.expand-control:hover,
.expand-control:focus-visible {
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.11);
  outline: none;
}

.round-control:focus-visible,
.expand-control:focus-visible {
  box-shadow: 0 0 0 3px rgb(var(--va-c-primary-rgb), 0.18);
}

.primary-control {
  width: 2.25rem;
  height: 2.25rem;
  color: white;
  background: var(--va-c-primary);
  font-size: 1.05rem;
}

.primary-control:hover,
.primary-control:focus-visible {
  color: white;
  background: var(--va-c-primary);
  filter: brightness(1.06);
}

.timeline {
  --music-progress-thumb-shadow: 0 0 0.55rem rgba(182, 82, 0, 0.5);

  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.28rem;
  color: var(--va-c-text-2);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
}

:global(html.dark .global-music-player .timeline) {
  --music-progress-thumb-shadow: 0 0 0.55rem rgb(255, 242, 223);
}

.timeline span:last-child {
  text-align: right;
}

.timeline input {
  --music-progress: 0%;

  appearance: none;
  width: 100%;
  height: 0.32rem;
  border: 0;
  border-radius: 999px;
  outline: none;
  background: linear-gradient(
    to right,
    var(--va-c-primary) 0 var(--music-progress),
    color-mix(in srgb, var(--va-c-text) 14%, var(--va-c-bg)) var(--music-progress) 100%
  );
  cursor: pointer;
}

.timeline input::-webkit-slider-runnable-track {
  height: 0.32rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
}

.timeline input::-webkit-slider-thumb {
  width: 0.9rem;
  height: 0.9rem;
  margin-top: -0.29rem;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: var(--va-c-primary);
  box-shadow: var(--music-progress-thumb-shadow);
}

.timeline input::-moz-range-track {
  height: 0.32rem;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--va-c-text) 14%, var(--va-c-bg));
}

.timeline input::-moz-range-progress {
  height: 0.32rem;
  border-radius: 999px;
  background: var(--va-c-primary);
}

.timeline input::-moz-range-thumb {
  width: 0.72rem;
  height: 0.72rem;
  border: 0;
  border-radius: 50%;
  background: var(--va-c-primary);
  box-shadow: var(--music-progress-thumb-shadow);
}

.player-error {
  position: absolute;
  right: 0;
  bottom: -0.72rem;
  left: 0;
  margin: 0;
  text-align: center;
  color: #d34b59;
  font-size: 0.62rem;
}

.secondary-controls {
  justify-content: flex-end;
}

.queue-control {
  position: relative;
  display: grid;
  place-items: center;
}

.queue-popover {
  --queue-scroll-thumb: rgb(var(--va-c-primary-rgb), 0);

  position: absolute;
  z-index: 5;
  right: 0;
  bottom: calc(100% + 0.45rem);
  display: flex;
  width: min(17rem, calc(100vw - 2rem));
  max-height: min(22rem, calc(100vh - 7rem));
  flex-direction: column;
  gap: 0.18rem;
  overflow-y: auto;
  border: 1px solid var(--player-border);
  border-radius: 0.8rem;
  padding: 0.55rem;
  background: var(--player-surface);
  box-shadow: 0 0.8rem 2rem rgb(0 0 0 / 0.2);
  backdrop-filter: blur(22px) saturate(1.2);
  scrollbar-color: var(--queue-scroll-thumb) transparent;
  scrollbar-width: thin;
  transition: scrollbar-color 180ms ease;
}

.queue-popover:hover,
.queue-popover:focus-within {
  --queue-scroll-thumb: rgb(var(--va-c-primary-rgb), 0.55);
}

.queue-popover::-webkit-scrollbar {
  width: 6px;
}

.queue-popover::-webkit-scrollbar-track {
  background: transparent;
}

.queue-popover::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background-color: var(--queue-scroll-thumb);
  transition: background-color 180ms ease;
}

.queue-popover > strong {
  padding: 0.25rem 0.4rem 0.4rem;
  font-size: 0.8rem;
}

.queue-item {
  display: grid;
  min-width: 0;
  grid-template-columns: 2.35rem minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  border: 0;
  border-radius: 0.55rem;
  padding: 0.45rem 0.5rem;
  text-align: left;
  color: var(--va-c-text);
  background: transparent;
  cursor: pointer;
}

.queue-item:hover,
.queue-item:focus-visible,
.queue-item.active {
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.11);
  outline: none;
}

.queue-item > img {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.45rem;
  object-fit: cover;
  background: var(--va-c-bg-soft);
}

.queue-item__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.03rem;
  line-height: 1.12;
}

.queue-item__copy strong,
.queue-item__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-item__copy strong {
  font-size: 0.8rem;
}

.queue-item__copy small {
  color: var(--va-c-text-2);
  font-size: 0.67rem;
}

.volume-control {
  position: relative;
  display: grid;
  place-items: center;
}

.volume-popover {
  position: absolute;
  z-index: 4;
  bottom: calc(100% + 0.45rem);
  left: 50%;
  display: flex;
  width: 3rem;
  align-items: center;
  flex-direction: column;
  gap: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--va-c-text) 14%, transparent);
  border-radius: 0.7rem;
  padding: 0.75rem 0 0.55rem;
  color: #fff;
  background: color-mix(in srgb, #202229 94%, transparent);
  box-shadow: 0 0.7rem 1.8rem rgb(0 0 0 / 0.25);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 0.35rem);
  transition: opacity 150ms ease, transform 150ms ease;
}

.volume-popover::after {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 0.55rem;
  content: '';
}

.volume-control:hover .volume-popover,
.volume-control:focus-within .volume-popover {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, 0);
}

.volume-popover span {
  font-variant-numeric: tabular-nums;
  font-size: 0.65rem;
}

.volume-slider {
  --music-volume: 70%;

  width: 0.34rem;
  height: 5.5rem;
  appearance: none;
  border-radius: 999px;
  outline: none;
  background: linear-gradient(
    to top,
    var(--va-c-primary) 0 var(--music-volume),
    rgb(255 255 255 / 0.2) var(--music-volume) 100%
  );
  cursor: pointer;
  writing-mode: vertical-lr;
  direction: rtl;
}

.volume-slider::-webkit-slider-runnable-track {
  width: 0.34rem;
  height: 5.5rem;
  border-radius: 999px;
  background: transparent;
}

.volume-slider::-webkit-slider-thumb {
  width: 0.82rem;
  height: 0.82rem;
  margin-left: -0.24rem;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 5px rgb(0 0 0 / 0.3);
}

.volume-slider::-moz-range-track {
  width: 0.34rem;
  border-radius: 999px;
  background: transparent;
}

.volume-slider::-moz-range-thumb {
  width: 0.82rem;
  height: 0.82rem;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 5px rgb(0 0 0 / 0.3);
}

.spin {
  animation: player-spin 850ms linear infinite;
}

.global-music-player.collapsed {
  right: auto;
  left: max(1rem, env(safe-area-inset-left));
  display: grid;
  width: auto;
  min-height: 5rem;
  grid-template-columns: 3.35rem 1.7rem 1.65rem;
  gap: 0.55rem;
  margin: 0;
  padding: 0.7rem 0.85rem;
}

.global-music-player.collapsed > img {
  width: 3.35rem;
  height: 3.35rem;
}

.collapsed-main-control {
  width: 1.7rem;
  height: 1.7rem;
  font-size: 0.82rem;
}

.collapsed-transport {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 0.05rem;
}

.expand-control {
  width: 1.65rem;
  height: 1.65rem;
  font-size: 0.85rem;
}

@keyframes player-spin {
  to { transform: rotate(360deg); }
}

@keyframes marquee-scroll {
  to { transform: translateX(-50%); }
}

@keyframes lyric-scroll {
  to { transform: translateX(var(--lyric-scroll-distance, 0)); }
}

@media (width < 1280px) {
  .global-music-player:not(.collapsed) {
    right: max(4.75rem, calc(env(safe-area-inset-right) + 4rem));
    left: max(1rem, env(safe-area-inset-left));
    width: auto;
    margin: 0;
  }
}

@media (width >= 768px) and (width < 1280px) {
  .global-music-player,
  .global-music-player.collapsed {
    height: 5.5rem;
    min-height: 5.5rem;
  }
}

@media (width >= 1280px) {
  .global-music-player.collapsed {
    height: 9rem;
    padding: 0.75rem;
  }

  .global-music-player:not(.collapsed) {
    --desktop-player-layout-left: max(1rem, calc((100vw - 42rem - var(--yun-post-card-max-width, 56.25rem)) / 2));

    right: auto;
    left: 1rem;
    width: calc(var(--desktop-player-layout-left) + 19rem);
    height: 9rem;
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.65rem;
    margin: 0;
    padding: 0.75rem;
  }

  .global-music-player:not(.collapsed) .track-summary {
    padding-right: 5.15rem;
  }

  .global-music-player:not(.collapsed) .transport {
    grid-column: 1;
  }

  .global-music-player:not(.collapsed) .secondary-controls {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
  }
}

@media (width >= 1280px) and (width < 1820px) {
  .global-music-player.collapsed,
  .global-music-player:not(.collapsed) {
    height: 10rem;
  }

  .global-music-player:not(.collapsed) .track-summary {
    position: absolute;
    top: 50%;
    right: 5.9rem;
    left: 0.75rem;
    padding-right: 0;
    transform: translateY(-50%);
  }

  .global-music-player:not(.collapsed) .transport {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
    left: 0.75rem;
  }
}

@media (width >= 1820px) {
  .global-music-player.collapsed {
    height: 5.25rem;
    min-height: 0;
    padding: 0.58rem 0.75rem;
  }

  .global-music-player:not(.collapsed) {
    height: 5.25rem;
    grid-template-columns: minmax(6.5rem, 0.8fr) minmax(12.45rem, 1.5fr) auto;
    gap: 0.45rem;
    padding: 0.58rem 0.75rem;
  }

  .global-music-player:not(.collapsed) .track-summary {
    padding-right: 0;
  }

  .global-music-player:not(.collapsed) .transport {
    grid-column: 2;
  }

  .global-music-player:not(.collapsed) .secondary-controls {
    position: static;
    grid-column: 3;
    justify-self: end;
    transform: none;
  }
}

@media (width < 768px) {
  .global-music-player:not(.collapsed) {
    bottom: max(0.65rem, env(safe-area-inset-bottom));
    left: max(0.65rem, env(safe-area-inset-left));
    min-height: 7.8rem;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 0.35rem 0.5rem;
    padding: 0.65rem 0.7rem 0.6rem;
  }

  .track-summary {
    grid-row: 1;
    grid-column: 1;
    grid-template-columns: 2.8rem minmax(0, 1fr);
  }

  .track-summary img {
    width: 2.8rem;
    height: 2.8rem;
  }

  .transport {
    grid-row: 2;
    grid-column: 1 / -1;
  }

  .current-lyric {
    margin: 0.1rem 0.75rem 0;
  }

  .timeline {
    margin: 0.15rem 0.35rem 0;
  }

  .secondary-controls {
    position: static;
    z-index: 1;
    grid-row: 1;
    grid-column: 2;
    justify-self: end;
    margin-right: 0;
  }

  .secondary-controls .round-control {
    width: 2.35rem;
    height: 2.35rem;
  }

  .player-error {
    bottom: -0.35rem;
    text-align: left;
  }

  .global-music-player.collapsed {
    width: auto;
    height: auto;
    min-height: 0;
    grid-template-columns: 2.8rem 1.7rem 1.65rem;
    padding: 0.45rem 0.6rem;
  }

  .global-music-player.collapsed > img {
    width: 2.8rem;
    height: 2.8rem;
  }
}
</style>
