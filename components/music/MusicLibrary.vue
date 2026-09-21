<script setup lang="ts">
import type { Song, SongKind } from './music'
import AlbumVisual from './AlbumVisual.vue'
import GlobalMetingBridge from './GlobalMetingBridge.vue'
import NeteaseMetingHost from './NeteaseMetingHost.vue'
import NowPlaying from './NowPlaying.vue'
import TrackList from './TrackList.vue'
import VideoDialog from './VideoDialog.vue'
import { getSongCoverUrl, handleSongCoverError } from './covers'
import { musicProfileLinks, songs } from '../../pages/posts/songs.config'
import { getSongSearchText, getSongYear, validateSongs } from './music'
import { useMusicPlayer } from './useMusicPlayer'
import { useSongMetadata } from './useSongMetadata'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const search = ref('')
const kind = ref<SongKind | 'all'>('all')
const year = ref<number | null>(null)
const videoOpen = ref(false)
const selectedSongStorageKey = 'yuumi-music-selected-song'

const years = computed(() => {
  const counts = new Map<number, number>()
  for (const song of songs) {
    const songYear = getSongYear(song)
    counts.set(songYear, (counts.get(songYear) || 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([optionYear, count]) => ({ year: optionYear, count }))
})

const filteredSongs = computed(() => {
  const query = search.value.trim().normalize('NFKC').toLocaleLowerCase()
  return songs.filter((song) => {
    if (year.value !== null && getSongYear(song) !== year.value)
      return false
    if (kind.value !== 'all' && song.kind !== kind.value)
      return false
    return !query || getSongSearchText(song).includes(query)
  })
})

const routeSong = Array.isArray(route.query.song) ? route.query.song[0] : route.query.song
const querySong = routeSong || (typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('song') || undefined
  : undefined)
const requestedSong = songs.find(song => song.id === querySong)
let rememberedSong: Song | undefined
if (!requestedSong && typeof window !== 'undefined') {
  try {
    const rememberedSongId = window.sessionStorage.getItem(selectedSongStorageKey)
    rememberedSong = songs.find(song => song.id === rememberedSongId)
  }
  catch {
    // Some privacy modes disable session storage; the first song remains the fallback.
  }
}
const initialSong = requestedSong || rememberedSong || songs[0]

const player = useMusicPlayer(songs, filteredSongs, initialSong, Boolean(requestedSong))
const songMetadata = useSongMetadata(player.currentSong, player.currentTime, player.currentSource)
const metingApi = import.meta.env.VITE_METING_API as string | undefined
const currentCover = computed(() => getSongCoverUrl(player.currentSong.value, 'cover'))

function selectSong(song: Song) {
  player.selectSong(song)
}

function openVideo() {
  player.pause()
  videoOpen.value = true
}

function rememberSelectedSong(id: string) {
  if (typeof window === 'undefined')
    return
  try {
    window.sessionStorage.setItem(selectedSongStorageKey, id)
  }
  catch {
    // Selection still works when session storage is unavailable.
  }
}

function profileIcon(platform: string) {
  if (platform === 'bilibili')
    return 'i-ri-bilibili-line'
  if (platform === 'netease')
    return 'i-ri-netease-cloud-music-line'
  if (platform === 'youtube')
    return 'i-ri-youtube-line'
  if (platform === 'qqmusic')
    return 'i-ri-qq-line'
  if (platform === 'acfun')
    return 'i-ri-music-2-line'
  return 'i-ri-external-link-line'
}

watch(() => player.currentSong.value.id, (id) => {
  rememberSelectedSong(id)
  if (route.query.song === id)
    return
  void router.replace({ query: { ...route.query, song: id } })
})

onMounted(() => {
  document.documentElement.classList.add('yuumi-music-library-page')

  const errors = validateSongs(songs)
  if (errors.length)
    console.warn('[Yuumi Music Library] 数据检查失败：', errors)

  if (route.query.song !== player.currentSong.value.id)
    void router.replace({ query: { ...route.query, song: player.currentSong.value.id } })
  rememberSelectedSong(player.currentSong.value.id)
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('yuumi-music-library-page')
})
</script>

<template>
  <div class="music-library">
    <header class="library-header">
      <div>
        <h1>Yuumi's Songs</h1>
      </div>
      <nav class="profile-links" aria-label="音乐主页">
        <a
          v-for="link in musicProfileLinks"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="link.label"
          :data-platform="link.platform"
        >
          <span :class="profileIcon(link.platform)" aria-hidden="true" />
          <span>{{ link.label }}</span>
        </a>
      </nav>
    </header>

    <div class="library-shell">
      <Transition name="atmosphere" mode="out-in">
        <img
          :key="player.currentSong.value.id"
          class="atmosphere-cover"
          :src="currentCover"
          alt=""
          aria-hidden="true"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="handleSongCoverError"
        >
      </Transition>

      <div class="library-grid">
        <TrackList
          :songs="filteredSongs"
          :total="songs.length"
          :current-id="player.currentSong.value.id"
          :search="search"
          :kind="kind"
          :year="year"
          :years="years"
          :has-playable-audio="player.hasPlayableSource"
          @select="selectSong"
          @update:search="search = $event"
          @update:kind="kind = $event"
          @update:year="year = $event"
        />

        <AlbumVisual
          :song="player.currentSong.value"
          :cover="currentCover"
          :is-playing="player.isPlaying.value"
          :is-loading="player.isLoading.value"
          :lyrics="songMetadata.metadata.value.lyrics"
          :active-lyric-index="songMetadata.activeLyricIndex.value"
          :lyrics-loading="songMetadata.isLoading.value"
        />

        <NowPlaying
          :song="player.currentSong.value"
          :source="player.currentSource.value"
          :source-index="player.currentSourceIndex.value"
          :is-playing="player.isPlaying.value"
          :is-loading="player.isLoading.value"
          :current-time="player.currentTime.value"
          :duration="player.duration.value"
          :can-play="player.canPlay.value"
          :error="player.error.value"
          :playback-mode="player.playbackMode.value"
          :volume="player.volume.value"
          :is-muted="player.isMuted.value"
          @toggle="player.togglePlayback"
          @previous="player.goPrevious"
          @next="player.goNext()"
          @cycle-mode="player.cyclePlaybackMode"
          @set-volume="player.setVolume"
          @toggle-mute="player.toggleMute"
          @seek="player.seek"
          @select-source="player.selectSource"
          @open-video="openVideo"
        />
      </div>
    </div>

    <NeteaseMetingHost
      v-if="player.backendType.value === 'netease' && player.currentSource.value?.type === 'netease'"
      :key="`${player.currentSource.value.id}-${player.backendKey.value}`"
      :source-id="player.currentSource.value.id"
      :song-id="player.currentSource.value.songId"
      :api="metingApi"
      @ready="player.connectNeteasePlayer"
      @metadata="songMetadata.applyMetingMetadata"
      @error="player.reportNeteaseError"
    />

    <GlobalMetingBridge @ready="player.connectGlobalPlayer" />

    <VideoDialog
      :open="videoOpen"
      :title="player.currentSong.value.title"
      :videos="player.currentSong.value.videos || []"
      @close="videoOpen = false"
    />

    <div class="mobile-player" aria-label="移动端播放器">
      <img
        :src="currentCover"
        :alt="`${player.currentSong.value.title} 封面`"
        width="44"
        height="44"
        decoding="async"
        referrerpolicy="no-referrer"
        @error="handleSongCoverError"
      >
      <div>
        <strong>{{ player.currentSong.value.title }}</strong>
        <span>{{ player.currentSong.value.artists.join(' / ') }}</span>
      </div>
      <button
        type="button"
        :disabled="!player.canPlay.value"
        :aria-label="player.isPlaying.value ? '暂停' : '播放'"
        @click="player.togglePlayback"
      >
        <span v-if="player.isLoading.value" class="i-ri-loader-4-line mobile-loading" aria-hidden="true" />
        <span v-else :class="player.isPlaying.value ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.music-library {
  --music-panel: color-mix(in srgb, var(--va-c-bg) 82%, transparent);
  --music-control: color-mix(in srgb, var(--va-c-bg-soft) 78%, transparent);
  --music-border: color-mix(in srgb, var(--va-c-text) 13%, transparent);

  width: min(96vw, 94rem);
  margin: 0 auto;
  color: var(--va-c-text);
}

.library-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1.65rem;
  padding: 0 0.35rem;
}

.library-header h1 {
  margin: 0;
  color: var(--va-c-text);
  font-family: var(--va-font-serif);
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1;
}

.profile-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.profile-links a {
  --platform-color: var(--va-c-primary);

  display: inline-flex;
  min-height: 2.3rem;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--music-border);
  border-radius: 999px;
  padding: 0.42rem 0.7rem;
  text-decoration: none;
  color: var(--va-c-text-2);
  background: var(--music-panel);
  backdrop-filter: blur(12px);
  font-size: 0.7rem;
  transition: border-color var(--va-transition-duration-fast), color var(--va-transition-duration-fast), transform var(--va-transition-duration-fast);
}

.profile-links a:hover {
  border-color: var(--platform-color);
  color: var(--platform-color);
  transform: translateY(-1px);
}

.profile-links a[data-platform='bilibili'] { --platform-color: #fa97b3ff; }
.profile-links a[data-platform='netease'] { --platform-color: #ca3636ff; }
.profile-links a[data-platform='qqmusic'] { --platform-color: #31c27cff; }
.profile-links a[data-platform='acfun'] { --platform-color: #fd4c5bff; }
.profile-links a[data-platform='youtube'] { --platform-color: #e03759ff; }

.library-shell {
  position: relative;
  border: 1px solid var(--music-border);
  border-radius: 1.35rem;
  overflow: hidden;
  background: color-mix(in srgb, var(--va-c-bg) 60%, transparent);
  box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 0.12);
  isolation: isolate;
  backdrop-filter: blur(18px);
}

:global(html.dark) .library-shell {
  box-shadow: 0 1.5rem 4rem rgb(255 255 255 / 0.09);
}

.atmosphere-cover {
  position: absolute;
  z-index: -2;
  inset: -12%;
  width: 124%;
  height: 124%;
  object-fit: cover;
  opacity: 0.1;
  filter: blur(55px) saturate(0.75);
  transform: scale(1.04);
}

.library-shell::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  background: color-mix(in srgb, var(--va-c-bg) 64%, transparent);
  content: '';
}

.library-grid {
  display: grid;
  height: min(47rem, calc(100vh - 10rem));
  min-height: min(47rem, calc(100vh - 10rem));
  max-height: 47rem;
  grid-template-columns: 20rem minmax(22rem, 1fr) 23rem;
}

.library-grid > * {
  min-height: 0;
}

.atmosphere-enter-active,
.atmosphere-leave-active {
  transition: opacity 400ms ease;
}

.atmosphere-enter-from,
.atmosphere-leave-to {
  opacity: 0;
}

.mobile-player {
  display: none;
}

@media (width < 1200px) and (width >= 768px) {
  .music-library {
    width: min(95vw, 72rem);
  }

  .library-grid {
    height: clamp(50rem, calc(100vh - 8rem), 54rem);
    min-height: 50rem;
    max-height: 54rem;
    grid-template-columns: minmax(18rem, 34%) minmax(0, 1fr);
    grid-template-rows: minmax(26rem, 1fr) minmax(23rem, auto);
  }

  .library-grid > :first-child {
    grid-row: 1 / 3;
  }

  .library-grid > .now-playing {
    margin-top: clamp(1.3rem, 14vw, 2.5rem);
  }
}

@media (width < 768px) {
  .music-library {
    width: min(100% - 1rem, 42rem);
    padding-bottom: 5.25rem;
  }

  .library-header {
    display: block;
    padding: 0 0.35rem;
  }

  .profile-links {
    justify-content: flex-start;
    margin-top: 1rem;
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: none;
  }

  .profile-links::-webkit-scrollbar {
    display: none;
  }

  .profile-links a span:last-child {
    display: none;
  }

  .profile-links a {
    justify-content: center;
    min-width: 2.4rem;
    padding-inline: 0.55rem;
    font-size: 1rem;
  }

  .library-shell {
    border-radius: 1rem;
  }

  .library-grid {
    display: flex;
    height: auto;
    min-height: 0;
    max-height: none;
    flex-direction: column;
  }

  .library-grid > :nth-child(1) { order: 3; }
  .library-grid > :nth-child(2) { order: 1; }
  .library-grid > :nth-child(3) { order: 2; }

  .library-grid > .now-playing {
    margin-top: clamp(1rem, 14vw, 2rem);
  }

  .mobile-player {
    position: fixed;
    z-index: 18;
    right: 0.65rem;
    bottom: max(0.65rem, env(safe-area-inset-bottom));
    left: 0.65rem;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 2.75rem;
    align-items: center;
    gap: 0.65rem;
    border: 1px solid var(--music-border);
    border-radius: 0.9rem;
    padding: 0.5rem;
    background: color-mix(in srgb, var(--va-c-bg) 88%, transparent);
    box-shadow: 0 0.8rem 2.5rem rgb(0 0 0 / 0.2);
    backdrop-filter: blur(20px);
  }

  .mobile-player img {
    width: 44px;
    height: 44px;
    border-radius: 0.58rem;
    object-fit: cover;
  }

  .mobile-player > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .mobile-player strong,
  .mobile-player span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-player strong {
    font-size: 0.8rem;
  }

  .mobile-player > div span {
    margin-top: 0.1rem;
    color: var(--va-c-text-2);
    font-size: 0.68rem;
  }

  .mobile-player button {
    display: grid;
    width: 2.65rem;
    height: 2.65rem;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: var(--va-c-bg);
    background: var(--va-c-primary);
    font-size: 1.25rem;
    cursor: pointer;
  }

  .mobile-player button:disabled {
    opacity: 0.4;
  }

  .mobile-loading {
    animation: mobile-spin 0.8s linear infinite;
  }

}

@keyframes mobile-spin {
  to { transform: rotate(1turn); }
}

@media (prefers-reduced-motion: reduce) {
  .profile-links a,
  .atmosphere-enter-active,
  .atmosphere-leave-active {
    transition: none;
  }

  .mobile-loading {
    animation: none;
  }
}
</style>
