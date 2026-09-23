<script setup lang="ts">
import type { PlayableTrack, SongVersion, TrackMetadata } from './music'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { MUSIC_COVER_PLACEHOLDER, handleSongCoverError } from './covers'
import { isPlayableTrack } from './music'
import { playRegisteredTrack, registerPlaylistTrack, useGlobalMusicPlayer } from './useGlobalMusicPlayer'
import { emptyTrackMetadata, loadVersionMetadata, useSongMetadata } from './useSongMetadata'

const props = withDefaults(defineProps<{
  trackId: string
  fallbackTitle?: string
  fallbackArtist?: string
  fallbackCover?: string
  neteaseId?: string
  bvid?: string
  page?: number | string
  audioUrl?: string
  playlist?: string
}>(), {
  fallbackTitle: '',
  fallbackArtist: '',
  fallbackCover: '',
  neteaseId: '',
  bvid: '',
  page: 1,
  audioUrl: '',
  playlist: 'default',
})

const route = useRoute()
const player = useGlobalMusicPlayer()
const root = ref<HTMLElement | null>(null)
const titleMarquee = ref<HTMLElement | null>(null)
const artistMarquee = ref<HTMLElement | null>(null)
const lyricMarquee = ref<HTMLElement | null>(null)
const titleOverflows = ref(false)
const artistOverflows = ref(false)
const lyricOverflows = ref(false)
const metadata = ref<TrackMetadata>(emptyTrackMetadata())
const metadataLoaded = ref(false)
const context = computed(() => `article:${route.path}:${props.playlist}`)
const globalTrackId = computed(() => `${context.value}:${props.trackId}`)

const item = computed<SongVersion>(() => {
  const page = Math.max(1, Number(props.page) || 1)
  return {
    id: props.trackId,
    metadataSources: [
      ...(props.neteaseId ? [{ type: 'netease' as const, songId: props.neteaseId }] : []),
      ...(props.bvid ? [{ type: 'bilibili' as const, bvid: props.bvid, page }] : []),
    ],
    playbackCandidates: [
      ...(props.audioUrl ? [{ type: 'url' as const, url: props.audioUrl }] : []),
      ...(props.neteaseId ? [{ type: 'netease' as const, songId: props.neteaseId }] : []),
      ...(props.bvid ? [{ type: 'bilibili' as const, bvid: props.bvid, page }] : []),
    ],
  }
})

const track = computed<PlayableTrack>(() => ({
  id: globalTrackId.value,
  title: metadata.value.title || props.fallbackTitle || props.trackId,
  artists: [metadata.value.artist || props.fallbackArtist || '未知歌手'],
  cover: metadata.value.cover || props.fallbackCover || MUSIC_COVER_PLACEHOLDER,
  versions: [item.value],
  preferRemoteMetadata: true,
}))
const trackArtist = computed(() => track.value.artists.join(' / '))

const isCurrent = computed(() => (
  player.contextId.value === context.value
  && player.currentTrack.value?.id === globalTrackId.value
))
const canPlay = computed(() => isPlayableTrack(track.value))
const activeTrack = computed<PlayableTrack | null>(() => isCurrent.value ? player.currentTrack.value : null)
const activeVersion = computed<SongVersion | null>(() => isCurrent.value ? player.currentVersion.value : null)
const playingMetadata = useSongMetadata(activeTrack, activeVersion, player.currentTime, isCurrent)
const currentLyric = playingMetadata.currentLyric
const progressPercent = computed(() => player.duration.value > 0 && isCurrent.value
  ? Math.min(100, Math.max(0, (player.currentTime.value / player.duration.value) * 100))
  : 0)

async function loadVisibleMetadata() {
  if (metadataLoaded.value)
    return
  metadataLoaded.value = true
  try {
    metadata.value = await loadVersionMetadata(item.value, false)
  }
  catch (error) {
    console.warn('[music-track] failed to load visible metadata', error)
  }
}

let observer: IntersectionObserver | null = null
let unregister: (() => void) | null = null
let token: symbol | null = null
let stopLyricWatch: (() => void) | null = null

function toggle() {
  if (isCurrent.value) {
    player.togglePlayback()
    return
  }
  if (token)
    playRegisteredTrack(context.value, token)
}

function onSeek(event: Event) {
  player.seek(Number((event.target as HTMLInputElement).value))
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0)
    return '0:00'
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

function textOverflowDistance(container: HTMLElement | null, selector = '.marquee-text') {
  const text = container?.querySelector<HTMLElement>(selector)
  if (!container || !text) {
    return 0
  }
  const textPadding = Number.parseFloat(getComputedStyle(text).paddingRight) || 0
  return Math.max(0, text.scrollWidth - textPadding - container.clientWidth)
}

function updateMarquees() {
  titleOverflows.value = textOverflowDistance(titleMarquee.value) > 1
  artistOverflows.value = textOverflowDistance(artistMarquee.value) > 1
  const distance = textOverflowDistance(lyricMarquee.value, 'span')
  lyricOverflows.value = isCurrent.value && distance > 1
  lyricMarquee.value?.style.setProperty('--lyric-scroll-distance', `${-distance}px`)
  lyricMarquee.value?.style.setProperty('--lyric-scroll-duration', `${Math.max(6, distance / 20)}s`)
}

function scheduleMarqueeUpdate() {
  void nextTick(updateMarquees)
}

onMounted(() => {
  window.addEventListener('resize', scheduleMarqueeUpdate)
  stopLyricWatch = watchEffect(() => {
    track.value.title
    trackArtist.value
    currentLyric.value
    isCurrent.value
    scheduleMarqueeUpdate()
  })
  const registration = registerPlaylistTrack(context.value, () => track.value, () => root.value)
  token = registration.token
  unregister = registration.unregister

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting))
        return
      observer?.disconnect()
      void loadVisibleMetadata()
    }, { rootMargin: '160px 0px' })
    if (root.value)
      observer.observe(root.value)
  }
  else {
    void loadVisibleMetadata()
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  unregister?.()
  stopLyricWatch?.()
  window.removeEventListener('resize', scheduleMarqueeUpdate)
})
</script>

<template>
  <article ref="root" class="music-track" :class="{ active: isCurrent }">
    <div class="music-track__identity">
      <img
        :src="track.cover"
        :alt="`${track.title} 封面`"
        width="64"
        height="64"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        @error="handleSongCoverError"
      >
      <div class="music-track__copy">
        <div ref="titleMarquee" class="music-track__marquee" :class="{ scrolling: titleOverflows }">
          <div :key="track.title" class="music-track__marquee-track">
            <strong class="marquee-text">{{ track.title }}</strong>
            <strong class="marquee-text marquee-copy" aria-hidden="true">{{ track.title }}</strong>
          </div>
        </div>
        <div ref="artistMarquee" class="music-track__marquee" :class="{ scrolling: artistOverflows }">
          <div :key="trackArtist" class="music-track__marquee-track">
            <span class="marquee-text">{{ trackArtist }}</span>
            <span class="marquee-text marquee-copy" aria-hidden="true">{{ trackArtist }}</span>
          </div>
        </div>
        <small v-if="isCurrent && player.error.value" role="status">{{ player.error.value }}</small>
      </div>
    </div>
    <div class="music-track__playback">
      <p
        ref="lyricMarquee"
        :class="{ idle: !isCurrent, scrolling: lyricOverflows }"
        aria-live="polite"
      >
        <span :key="isCurrent ? currentLyric : 'idle'">{{ isCurrent ? currentLyric : '\u00a0' }}</span>
      </p>
      <div class="music-track__timeline">
        <span>{{ formatTime(isCurrent ? player.currentTime.value : 0) }}</span>
        <input
          type="range"
          min="0"
          :max="Math.max(player.duration.value, 0)"
          step="0.1"
          :value="isCurrent ? Math.min(player.currentTime.value, player.duration.value || 0) : 0"
          :disabled="!isCurrent || !player.duration.value"
          :style="{ '--music-progress': `${progressPercent}%` }"
          :aria-label="`${track.title} 播放进度`"
          @input="onSeek"
        >
        <span>{{ formatTime(isCurrent ? player.duration.value : 0) }}</span>
      </div>
    </div>
    <button
      type="button"
      class="music-track__toggle"
      :aria-label="isCurrent && player.isPlaying.value ? `暂停 ${track.title}` : `播放 ${track.title}`"
      :aria-pressed="isCurrent && player.isPlaying.value"
      :disabled="!canPlay"
      @click="toggle"
    >
      <span
        v-if="isCurrent && player.isLoading.value"
        class="i-ri-loader-4-line music-track__loading"
        aria-hidden="true"
      />
      <span
        v-else
        :class="isCurrent && player.isPlaying.value ? 'i-ri-pause-fill' : 'i-ri-play-fill'"
        aria-hidden="true"
      />
    </button>
  </article>
</template>

<style scoped>
.music-track {
  display: grid;
  grid-template-columns: minmax(10rem, 1fr) minmax(18rem, 2.6fr) auto;
  align-items: center;
  gap: clamp(0.85rem, 2vw, 1.5rem);
  margin: 1rem 0;
  border: 1px solid color-mix(in srgb, var(--va-c-text) 13%, transparent);
  border-radius: 0.95rem;
  padding: 0.9rem clamp(1.5rem, 4vw, 3rem);
  color: var(--va-c-text);
  background: color-mix(in srgb, var(--va-c-bg-soft) 78%, transparent);
  transition: border-color 180ms ease, background-color 180ms ease;
}

.music-track.active {
  border-color: rgb(var(--va-c-primary-rgb), 0.42);
  background: rgb(var(--va-c-primary-rgb), 0.08);
}

.music-track__identity {
  display: grid;
  min-width: 0;
  grid-template-columns: 4rem minmax(0, 1fr);
  align-items: center;
  gap: 0.85rem;
}

.music-track__identity img {
  display: block;
  width: 4rem;
  height: 4rem;
  min-width: 4rem;
  min-height: 4rem;
  max-width: none;
  aspect-ratio: 1;
  border-radius: 0.7rem;
  object-fit: cover;
  background: var(--va-c-bg-soft);
}

.music-track__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.music-track__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-track__marquee {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.music-track__marquee-track {
  display: flex;
  width: max-content;
}

.music-track__marquee .marquee-text {
  display: block;
  flex: 0 0 auto;
}

.music-track__marquee .marquee-copy {
  display: none;
}

.music-track__marquee.scrolling .music-track__marquee-track {
  animation: music-track-marquee 18s linear 1s infinite;
}

.music-track__marquee.scrolling .marquee-text {
  padding-right: 2rem;
}

.music-track__marquee.scrolling .marquee-copy {
  display: block;
}

.music-track__playback {
  --music-progress-thumb-shadow: 0 0 0.55rem rgba(182, 82, 0, 0.5);

  box-sizing: border-box;
  width: 100%;
  max-width: none;
  min-width: 0;
  justify-self: center;
  padding-inline: 0.2rem;
}

:global(html.dark .music-track .music-track__playback) {
  --music-progress-thumb-shadow: 0 0 0.55rem rgb(255, 242, 223);
}

.music-track__playback p {
  min-height: 1.3em;
  margin: 0 0 0.42rem;
  overflow: hidden;
  text-align: center;
  white-space: nowrap;
  color: var(--va-c-text-2);
  font-size: clamp(0.75rem, 1.2vw, 0.9rem);
}

.music-track__playback p.idle {
  user-select: none;
}

.music-track__playback p span {
  display: block;
  width: max-content;
  min-width: 100%;
  text-align: center;
}

.music-track__playback p.scrolling span {
  min-width: 0;
  text-align: left;
  animation: music-track-lyric-scroll var(--lyric-scroll-duration, 8s) linear 1s 1 forwards;
}

.music-track__timeline {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.25rem;
  color: var(--va-c-text-2);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.music-track__timeline > span:last-child {
  text-align: right;
}

.music-track__playback input {
  --music-progress: 0%;

  appearance: none;
  display: block;
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

.music-track__playback input::-webkit-slider-runnable-track {
  height: 0.32rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
}

.music-track__playback input::-webkit-slider-thumb {
  width: 0.9rem;
  height: 0.9rem;
  margin-top: -0.29rem;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: var(--va-c-primary);
  box-shadow: var(--music-progress-thumb-shadow);
}

.music-track__playback input::-moz-range-track {
  height: 0.32rem;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--va-c-text) 14%, var(--va-c-bg));
}

.music-track__playback input::-moz-range-progress {
  height: 0.32rem;
  border-radius: 999px;
  background: var(--va-c-primary);
}

.music-track__playback input::-moz-range-thumb {
  width: 0.72rem;
  height: 0.72rem;
  border: 0;
  border-radius: 50%;
  background: var(--va-c-primary);
  box-shadow: var(--music-progress-thumb-shadow);
}

.music-track__playback input:disabled {
  cursor: default;
  opacity: 0.42;
}

.music-track__copy strong {
  font-size: 0.95rem;
}

.music-track__copy span {
  color: var(--va-c-text-2);
  font-size: 0.78rem;
}

.music-track__copy small {
  margin-top: 0.2rem;
  color: #d34b59;
  font-size: 0.68rem;
}

.music-track button {
  display: grid;
  width: 2.7rem;
  height: 2.7rem;
  place-items: center;
  border: 0;
  border-radius: 999px;
  color: white;
  background: var(--va-c-primary);
  cursor: pointer;
}

.music-track__toggle {
  justify-self: end;
}

.music-track button:not(:disabled):hover {
  filter: brightness(1.1);
}

.music-track button:focus-visible {
  outline: 3px solid rgb(var(--va-c-primary-rgb), 0.22);
  outline-offset: 2px;
}

.music-track button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.music-track__loading {
  animation: music-track-spin 850ms linear infinite;
}

@keyframes music-track-spin {
  to { transform: rotate(360deg); }
}

@keyframes music-track-lyric-scroll {
  to { transform: translateX(var(--lyric-scroll-distance, 0)); }
}

@keyframes music-track-marquee {
  to { transform: translateX(-50%); }
}

@media (width < 768px) {
  .music-track {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.8rem 1rem;
    padding: 0.9rem 1.5rem;
  }

  .music-track__identity {
    grid-row: 1;
    grid-column: 1;
  }

  .music-track__playback {
    grid-column: 1 / -1;
    grid-row: 2;
    max-width: none;
    padding: 0.1rem clamp(0.35rem, 4vw, 1.25rem) 0.2rem;
  }

  .music-track__toggle {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>
