<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import PlaybackModeIcon from './PlaybackModeIcon.vue'
import VolumeIcon from './VolumeIcon.vue'
import { MUSIC_COVER_PLACEHOLDER, handleSongCoverError } from './covers'
import { formatPlaybackTime, getPlaybackProgress } from './music'
import { PLAYBACK_MODE_LABELS, useGlobalMusicPlayer } from './useGlobalMusicPlayer'
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
const metadata = useSongMetadata(player.currentTrack, player.currentVersion, player.currentTime)
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

const progressPercent = computed(() => getPlaybackProgress(player.currentTime.value, player.duration.value))
const modeLabel = computed(() => PLAYBACK_MODE_LABELS[player.playbackMode.value])
const hasMultipleVersions = computed(() => (player.currentTrack.value?.versions.length || 0) > 1)

function onSeek(event: Event) {
  player.seek(Number((event.target as HTMLInputElement).value))
}

function onVolume(event: Event) {
  player.setVolume(Number((event.target as HTMLInputElement).value))
}

function releasePointerFocus(event: MouseEvent) {
  if (event.detail > 0 && event.target instanceof Element)
    event.target.closest<HTMLElement>('button, input')?.blur()
}

function textOverflowDistance(container: HTMLElement | null) {
  const text = container?.querySelector<HTMLElement>('.music-marquee__text')
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
    @click="releasePointerFocus"
  >
    <template v-if="player.isCollapsed.value">
      <button
        type="button"
        class="collapsed-cover-control"
        :aria-label="player.isPlaying.value ? '暂停' : '播放'"
        :aria-pressed="player.isPlaying.value"
        @click="player.togglePlayback"
      >
        <img :src="cover" :alt="`${title} 封面`" @error="handleSongCoverError">
        <span
          :class="player.isPlaying.value ? 'i-ri-pause-circle-line' : 'i-ri-play-circle-line'"
          class="collapsed-playback-icon"
          aria-hidden="true"
        />
      </button>
      <div class="collapsed-transport">
        <button type="button" class="round-control collapsed-main-control" aria-label="下一首" @click="player.goNext()">
          <span class="i-ri-skip-forward-fill" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="round-control collapsed-main-control"
          aria-label="展开播放器"
          @click="player.toggleCollapsed"
        >
          <span class="i-ri-expand-left-right-line" aria-hidden="true" />
        </button>
      </div>
    </template>

    <template v-else>
      <div class="track-summary">
        <img :src="cover" :alt="`${title} 封面`" @error="handleSongCoverError">
        <div
          class="track-summary-copy"
          :tabindex="hasMultipleVersions ? 0 : undefined"
          :aria-label="hasMultipleVersions ? '切换播放版本' : undefined"
        >
          <div ref="titleMarquee" class="music-marquee" :class="{ 'is-scrolling': titleOverflows }">
            <div :key="title" class="music-marquee__track">
              <strong class="music-marquee__text">{{ title }}</strong>
              <strong class="music-marquee__text music-marquee__copy" aria-hidden="true">{{ title }}</strong>
            </div>
          </div>
          <div ref="artistMarquee" class="music-marquee" :class="{ 'is-scrolling': artistOverflows }">
            <div :key="artist" class="music-marquee__track">
              <span class="music-marquee__text">{{ artist }}</span>
              <span class="music-marquee__text music-marquee__copy" aria-hidden="true">{{ artist }}</span>
            </div>
          </div>
          <div
            v-if="hasMultipleVersions"
            class="global-version-popover"
            aria-label="歌曲版本"
          >
            <button
              v-for="(item, index) in player.currentTrack.value.versions"
              :key="item.id"
              type="button"
              class="music-version-button"
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
            class="current-lyric music-marquee"
            :class="{ 'is-scrolling': lyricOverflows }"
            aria-live="polite"
          >
            <div :key="currentLyric" class="music-marquee__track">
              <span class="music-marquee__text">{{ currentLyric }}</span>
              <span class="music-marquee__text music-marquee__copy" aria-hidden="true">{{ currentLyric }}</span>
            </div>
          </div>
          <div class="transport-buttons">
            <button type="button" class="round-control" :aria-label="modeLabel" @click="player.cyclePlaybackMode">
              <PlaybackModeIcon :mode="player.playbackMode.value" mask-id="global-music-stop-slash-mask" />
            </button>
            <button type="button" class="round-control" aria-label="上一首" @click="player.goPrevious">
              <span class="i-ri-skip-back-fill" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="round-control primary-control"
              :aria-label="player.isPlaying.value ? '暂停' : '播放'"
              :aria-pressed="player.isPlaying.value"
              @click="player.togglePlayback"
            >
              <span v-if="player.isLoading.value" class="i-ri-loader-4-line spin" aria-hidden="true" />
              <span v-else :class="player.isPlaying.value ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
            </button>
            <button type="button" class="round-control" aria-label="下一首" @click="player.goNext()">
              <span class="i-ri-skip-forward-fill" aria-hidden="true" />
            </button>
            <div class="music-volume-control">
              <button
                type="button"
                class="round-control"
                :aria-label="player.isMuted.value ? '取消静音' : '静音'"
                :aria-pressed="player.isMuted.value"
                @click="player.toggleMute"
              >
                <VolumeIcon :volume="player.volume.value" :is-muted="player.isMuted.value" />
              </button>
              <div class="music-volume-popover">
                <input
                  class="music-volume-slider"
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
          <span>{{ formatPlaybackTime(player.currentTime.value) }}</span>
          <input
            class="music-progress-slider"
            type="range"
            min="0"
            :max="Math.max(player.duration.value, 0)"
            step="0.1"
            :value="Math.min(player.currentTime.value, player.duration.value || 0)"
            :style="{ '--music-progress': `${progressPercent}%` }"
            aria-label="播放进度"
            @input="onSeek"
          >
          <span>{{ formatPlaybackTime(player.duration.value) }}</span>
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
          <span class="i-ri-contract-left-right-line" aria-hidden="true" />
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
  position: relative;
  z-index: 2;
  display: grid;
  min-width: 0;
  grid-template-columns: 3.35rem minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.track-summary img {
  width: 3.35rem;
  height: 3.35rem;
  border-radius: 0.7rem;
  object-fit: cover;
  background: var(--va-c-bg-soft);
}

.track-summary-copy {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.track-summary-copy:focus-visible {
  border-radius: 0.3rem;
  outline: 2px solid rgb(var(--va-c-primary-rgb), 0.45);
  outline-offset: 0.2rem;
}

.track-summary strong,
.track-summary span {
  white-space: nowrap;
}

.track-summary strong {
  font-size: 0.88rem;
}

.track-summary span {
  color: var(--va-c-text-2);
  font-size: 0.7rem;
}

.global-version-popover {
  position: absolute;
  z-index: 6;
  bottom: calc(100% + 0.45rem);
  left: 0;
  display: flex;
  box-sizing: border-box;
  width: max-content;
  max-width: min(20rem, calc(100vw - 2rem));
  flex-wrap: wrap;
  gap: 0.35rem;
  border: 1px solid var(--player-border);
  border-radius: 0.7rem;
  padding: 0.55rem;
  color: var(--va-c-text);
  background: var(--player-surface);
  box-shadow: 0 0.7rem 1.8rem rgb(0 0 0 / 0.2);
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.35rem);
  transition: opacity 150ms ease, transform 150ms ease, visibility 150ms ease;
  visibility: hidden;
}

.global-version-popover::after {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 0.55rem;
  content: '';
}

.track-summary-copy:hover .global-version-popover,
.track-summary-copy:focus-within .global-version-popover {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
  visibility: visible;
}

.global-version-popover .music-version-button {
  flex: 0 0 auto;
  padding: 0.28rem 0.55rem;
  font: inherit;
  font-size: 0.68rem;
  white-space: nowrap;
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

.current-lyric:not(.is-scrolling) .music-marquee__track {
  width: 100%;
  justify-content: center;
}

.current-lyric.is-scrolling .music-marquee__track {
  animation: lyric-scroll var(--lyric-scroll-duration, 8s) linear 1s 1 forwards;
}

.current-lyric.is-scrolling .music-marquee__text {
  padding-right: 0;
}

.current-lyric.is-scrolling .music-marquee__copy {
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

.global-music-player:not(.collapsed):hover .current-lyric,
.global-music-player:not(.collapsed):focus-within .current-lyric {
  opacity: 0;
  visibility: hidden;
}

.global-music-player:not(.collapsed):hover .transport-buttons,
.global-music-player:not(.collapsed):focus-within .transport-buttons {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

.round-control {
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

.round-control:hover,
.round-control:focus-visible {
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.11);
  outline: none;
}

.round-control:focus-visible {
  box-shadow: 0 0 0 3px rgb(var(--va-c-primary-rgb), 0.18);
}

.primary-control {
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
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.28rem;
  color: var(--va-c-text-2);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
}

.timeline span:last-child {
  text-align: right;
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

.spin {
  animation: player-spin 850ms linear infinite;
}

.global-music-player.collapsed {
  right: auto;
  width: auto;
  grid-template-columns: 3.35rem 1.7rem;
  gap: 0.55rem;
  margin: 0;
}

.collapsed-cover-control {
  position: relative;
  display: block;
  width: 3.35rem;
  height: 3.35rem;
  overflow: hidden;
  border: 0;
  border-radius: 0.7rem;
  padding: 0;
  background: var(--va-c-bg-soft);
  cursor: pointer;
}

.collapsed-cover-control img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
}

.collapsed-cover-control:focus-visible {
  outline: 2px solid var(--va-c-primary);
  outline-offset: 2px;
}

.collapsed-playback-icon {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  display: block;
  width: 2.35rem;
  height: 2.35rem;
  box-shadow: none;
  color: #fff;
  filter: none;
  pointer-events: none;
  text-shadow: none;
  transform: translate(-50%, -50%);
  transition: top 220ms ease, left 220ms ease, width 220ms ease, height 220ms ease, transform 220ms ease;
}

.global-music-player.collapsed:not(.paused) .collapsed-playback-icon {
  top: calc(100% - 0.3rem);
  left: calc(100% - 0.3rem);
  width: 1rem;
  height: 1rem;
  transform: translate(-100%, -100%);
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

@media (hover: none) {
  .global-music-player:not(.collapsed).paused .current-lyric {
    opacity: 0;
    visibility: hidden;
  }

  .global-music-player:not(.collapsed).paused .transport-buttons {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
  }
}

@keyframes player-spin {
  to { transform: rotate(360deg); }
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
  .global-music-player {
    height: 5.5rem;
    min-height: 5.5rem;
  }
}

@media (width >= 1280px) {
  .global-music-player:not(.collapsed) {
    right: auto;
    left: 1rem;
    width: calc((100vw - 42rem) / 2 - 2rem);
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
    top: 1.3rem;
    right: 0.75rem;
    transform: none;
  }
}

@media (width >= 1536px) {
  .global-music-player:not(.collapsed) {
    width: calc((100vw - var(--yun-post-card-max-width, 56.25rem)) / 2 - 2rem);
  }
}

@media (width >= 1280px) and (width < 1820px) {
  .global-music-player:not(.collapsed) {
    height: auto;
    min-height: 9rem;
  }

  .global-music-player:not(.collapsed) .secondary-controls {
    z-index: 3;
  }

  .queue-popover {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }

  .global-music-player:not(.collapsed) .player-error {
    position: static;
    margin-top: 0.15rem;
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
    position: static;
    margin: 0.15rem 0.35rem 0;
    text-align: center;
  }

  .global-music-player.collapsed {
    min-height: 0;
    grid-template-columns: 2.8rem 1.7rem;
    padding: 0.45rem 0.6rem;
  }

  .collapsed-cover-control {
    width: 2.8rem;
    height: 2.8rem;
  }
}
</style>
