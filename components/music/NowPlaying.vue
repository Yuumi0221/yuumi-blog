<script setup lang="ts">
import type { Song, SongAudioSource } from './music'
import type { PlaybackMode } from './useMusicPlayer'
import { computed } from 'vue'

const props = defineProps<{
  song: Song
  source: SongAudioSource | null
  sourceIndex: number
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  canPlay: boolean
  error: string | null
  playbackMode: PlaybackMode
  volume: number
  isMuted: boolean
}>()

const emit = defineEmits<{
  toggle: []
  previous: []
  next: []
  'cycle-mode': []
  'set-volume': [volume: number]
  'toggle-mute': []
  seek: [time: number]
  'select-source': [index: number]
  'open-video': []
}>()

const progressMax = computed(() => Math.max(props.duration, 0))
const progressPercent = computed(() => props.duration > 0
  ? Math.min(100, Math.max(0, (props.currentTime / props.duration) * 100))
  : 0)

const playbackModeMeta = computed(() => ({
  list: { label: '列表循环', icon: 'i-ri-repeat-2-line' },
  one: { label: '单曲循环', icon: 'i-ri-repeat-one-line' },
  random: { label: '随机播放', icon: 'i-ri-shuffle-line' },
  stop: { label: '播完暂停', icon: 'i-ri-stop-circle-line' },
})[props.playbackMode])

const volumeIcon = computed(() => {
  if (props.isMuted || props.volume === 0)
    return 'i-ri-volume-mute-line'
  if (props.volume < 0.5)
    return 'i-ri-volume-down-line'
  return 'i-ri-volume-up-line'
})

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0)
    return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

function onSeek(event: Event) {
  emit('seek', Number((event.target as HTMLInputElement).value))
}

function onVolumeInput(event: Event) {
  emit('set-volume', Number((event.target as HTMLInputElement).value))
}

function linkIcon(platform: string) {
  if (platform === 'bilibili')
    return 'i-ri-bilibili-line'
  if (platform === 'netease')
    return 'i-ri-netease-cloud-music-line'
  if (platform === 'youtube')
    return 'i-ri-youtube-line'
  return 'i-ri-external-link-line'
}

function linkDisplayLabel(label: string) {
  return label.replace(/^(?:Bilibili|网易云音乐|网易云|QQ\s*音乐|AcFun|YouTube)(?:\s*[·｜|/—-]\s*)?/i, '').trim()
}

</script>

<template>
  <section class="now-playing" aria-label="当前歌曲详情">
    <div class="now-playing__scroll">
      <p class="eyebrow"></p>
      <h2>{{ song.title }}</h2>
      <p class="artists">{{ song.artists.join(' / ') }}</p>
      <time :datetime="song.date">{{ song.date.replaceAll('-', '.') }}</time>

      <div v-if="song.audioSources && song.audioSources.length > 1" class="source-picker">
        <p>音源版本</p>
        <div>
          <button
            v-for="(item, index) in song.audioSources"
            :key="item.id"
            type="button"
            :class="{ active: sourceIndex === index }"
            :aria-pressed="sourceIndex === index"
            :disabled="item.availability === 'unavailable'"
            :title="item.note"
            @click="emit('select-source', index)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="player-controls" :class="{ disabled: !canPlay }">
        <div class="progress-wrap">
          <input
            type="range"
            min="0"
            :max="progressMax"
            :value="Math.min(currentTime, progressMax)"
            step="0.1"
            :disabled="!canPlay || !duration"
            :style="{ '--music-progress': `${progressPercent}%` }"
            aria-label="播放进度"
            @input="onSeek"
          >
          <div class="time-row">
            <span>{{ formatTime(currentTime) }}</span>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>

        <div class="control-row">
          <button
            type="button"
            class="mode-button"
            :aria-label="`播放顺序：${playbackModeMeta.label}。点击切换`"
            :title="playbackModeMeta.label"
            @click="emit('cycle-mode')"
          >
            <span :class="playbackModeMeta.icon" aria-hidden="true" />
          </button>
          <button type="button" class="skip-button" aria-label="上一首" @click="emit('previous')">
            <span class="i-ri-skip-back-mini-fill" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="play-button"
            :disabled="!canPlay"
            :aria-label="isPlaying ? '暂停' : '播放'"
            @click="emit('toggle')"
          >
            <span v-if="isLoading" class="i-ri-loader-4-line loading-icon" aria-hidden="true" />
            <span v-else :class="isPlaying ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
          </button>
          <button type="button" class="skip-button" aria-label="下一首" @click="emit('next')">
            <span class="i-ri-skip-forward-mini-fill" aria-hidden="true" />
          </button>
          <div class="volume-control">
            <div class="volume-popover">
              <input
                class="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="volume"
                :style="{ '--music-volume': `${volume * 100}%` }"
                aria-label="音量"
                @input="onVolumeInput"
              >
              <span>{{ Math.round(volume * 100) }}%</span>
            </div>
            <button
              type="button"
              class="volume-button"
              :aria-label="isMuted ? '取消静音' : '静音'"
              :title="isMuted ? '取消静音' : '静音'"
              @click="emit('toggle-mute')"
            >
              <span :class="volumeIcon" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p v-if="!source && canPlay" class="player-message">正在解析 Bilibili 音频…</p>
        <p v-else-if="!canPlay" class="player-message">这首作品目前仅作档案展示</p>
        <p v-if="error" class="player-message player-message--error" role="status">{{ error }}</p>
      </div>

      <div v-if="song.links?.length || song.videos?.length" class="action-row">
        <a
          v-for="link in song.links"
          :key="`${link.platform}-${link.url}`"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="link.label"
          :aria-label="link.label"
          :class="{ 'icon-only': !linkDisplayLabel(link.label) }"
        >
          <span :class="linkIcon(link.platform)" aria-hidden="true" />
          <span v-if="linkDisplayLabel(link.label)">{{ linkDisplayLabel(link.label) }}</span>
        </a>
        <button v-if="song.videos?.length" type="button" @click="emit('open-video')">
          <span class="i-ri-movie-2-line" aria-hidden="true" />
          查看 MV
        </button>
      </div>

      <div v-if="song.notes?.length" class="song-notes">
        <p v-for="note in song.notes" :key="note">{{ note }}</p>
      </div>

      <dl class="credits">
        <template v-for="item in song.credits" :key="`${item.role}-${item.values.map(value => value.text).join('-')}`">
          <dt>{{ item.role }}</dt>
          <dd>
            <template v-for="(entry, index) in item.values" :key="`${entry.text}-${index}`">
              <a v-if="entry.url" :href="entry.url" target="_blank" rel="noopener noreferrer">{{ entry.text }}</a>
              <span v-else>{{ entry.text }}</span><span v-if="index < item.values.length - 1" class="separator"> / </span>
            </template>
          </dd>
        </template>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.now-playing {
  --details-scroll-thumb: rgb(var(--va-c-primary-rgb), 0);

  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--music-border);
  background: var(--music-panel);
}

.now-playing__scroll {
  height: 100%;
  min-height: 0;
  padding: 1.5rem 1.35rem;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--details-scroll-thumb) transparent;
  scrollbar-width: thin;
  transition: scrollbar-color 180ms ease;
}

.now-playing__scroll::-webkit-scrollbar {
  width: 6px;
}

.now-playing__scroll::-webkit-scrollbar-track {
  background: transparent;
}

.now-playing__scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background-color: var(--details-scroll-thumb);
  transition: background-color 180ms ease;
}

.now-playing:hover,
.now-playing:focus-within {
  --details-scroll-thumb: rgb(var(--va-c-primary-rgb), 0.55);
}

.eyebrow {
  margin: 0 0 1.5rem;
  color: var(--va-c-primary);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

h2 {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--va-c-text);
  font-family: var(--va-font-serif);
  font-size: clamp(1.45rem, 2.3vw, 2rem);
  line-height: 1.2;
}

.artists {
  margin: 0.65rem 0 0.25rem;
  color: var(--va-c-text);
  font-size: 0.9rem;
}

time {
  color: var(--va-c-text-2);
  font-size: 0.78rem;
}

.source-picker {
  margin-top: 1.4rem;
}

.source-picker p {
  margin: 0 0 0.5rem;
  color: var(--va-c-text-2);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.source-picker > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.source-picker button {
  border: 1px solid var(--music-border);
  border-radius: 999px;
  padding: 0.35rem 0.62rem;
  color: var(--va-c-text-2);
  background: transparent;
  font-size: 0.7rem;
  cursor: pointer;
}

.source-picker button.active {
  border-color: var(--va-c-primary);
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.1);
}

.source-picker button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  text-decoration: line-through;
}

.player-controls {
  margin-top: 1.7rem;
}

.progress-wrap {
  --music-progress-thumb-shadow: 0 0 0.55rem rgba(182, 82, 0, 0.5);
}

:global(html.dark) .progress-wrap {
  --music-progress-thumb-shadow: 0 0 0.55rem rgb(255, 242, 223);
}

.progress-wrap input {
  --music-progress: 0%;

  appearance: none;
  width: 100%;
  height: 0.32rem;
  border-radius: 999px;
  outline: none;
  background: linear-gradient(
    to right,
    var(--va-c-primary) 0 var(--music-progress),
    color-mix(in srgb, var(--va-c-text) 14%, var(--va-c-bg)) var(--music-progress) 100%
  );
  cursor: pointer;
}

.progress-wrap input::-webkit-slider-runnable-track {
  height: 0.32rem;
  border-radius: 999px;
  background: transparent;
}

.progress-wrap input::-webkit-slider-thumb {
  width: 0.9rem;
  height: 0.9rem;
  margin-top: -0.29rem;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: var(--va-c-primary);
  box-shadow: var(--music-progress-thumb-shadow);
}

.progress-wrap input::-moz-range-track {
  height: 0.32rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--va-c-text) 14%, var(--va-c-bg));
}

.progress-wrap input::-moz-range-progress {
  height: 0.32rem;
  border-radius: 999px;
  background: var(--va-c-primary);
}

.progress-wrap input::-moz-range-thumb {
  width: 0.72rem;
  height: 0.72rem;
  border: 0;
  border-radius: 50%;
  background: var(--va-c-primary);
  box-shadow: var(--music-progress-thumb-shadow);
}

.progress-wrap input:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.time-row {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  color: var(--va-c-text-2);
  font-variant-numeric: tabular-nums;
  font-size: 0.68rem;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.9rem;
}

.control-row button {
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--va-c-text);
  background: transparent;
  cursor: pointer;
}

.skip-button {
  width: 2.6rem;
  height: 2.6rem;
  font-size: 1.45rem;
}

.mode-button {
  width: 2.35rem;
  height: 2.35rem;
  color: var(--va-c-primary) !important;
  background: rgb(var(--va-c-primary-rgb), 0.09) !important;
  font-size: 1.15rem;
}

.mode-button:hover {
  background: rgb(var(--va-c-primary-rgb), 0.16) !important;
}

.volume-control {
  position: relative;
  display: grid;
  place-items: center;
}

.volume-button {
  width: 2.35rem;
  height: 2.35rem;
  font-size: 1.2rem;
}

.volume-button:hover,
.volume-control:focus-within .volume-button {
  background: rgb(var(--va-c-primary-rgb), 0.09) !important;
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

.skip-button:hover {
  background: rgb(var(--va-c-primary-rgb), 0.09);
}

.play-button {
  position: relative;
  width: 3.35rem;
  height: 3.35rem;
  padding: 0;
  color: var(--va-c-bg) !important;
  background: var(--va-c-primary) !important;
  box-shadow: 0 0 1.5rem rgb(var(--va-c-primary-rgb), 0.25);
  font-size: 1.6rem;
  line-height: 1;
}

.play-button > span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1em;
  height: 1em;
  transform: translate(-50%, -50%);
}

.play-button:disabled {
  box-shadow: none;
  cursor: not-allowed;
  filter: grayscale(0.65);
  opacity: 0.45;
}

.loading-icon {
  animation: loading-spin 0.8s linear infinite;
}

.player-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin: 0.75rem 0 0;
  text-align: center;
  color: var(--va-c-text-2);
  font-size: 0.7rem;
}

.player-message--error {
  color: var(--va-c-danger, #c54f4f);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.35rem;
  justify-content: center;
}

.action-row a,
.action-row button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--music-border);
  border-radius: 0.7rem;
  padding: 0.45rem 0.65rem;
  text-decoration: none;
  color: var(--va-c-text);
  background: var(--music-control);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
}

.action-row a.icon-only {
  width: 2.25rem;
  justify-content: center;
  padding-inline: 0;
  font-size: 0.9rem;
}

.action-row a:hover,
.action-row button:hover {
  border-color: var(--va-c-primary);
  color: var(--va-c-primary);
}

.song-notes {
  margin-top: 1.1rem;
  border-left: 3px solid var(--va-c-primary);
  border-radius: 0.4rem;
  padding: 0.6rem 0.75rem;
  color: var(--va-c-text-2);
  background: rgb(var(--va-c-primary-rgb), 0.08);
  font-size: 0.76rem;
}

.song-notes p {
  margin: 0;
}

.song-notes p + p {
  margin-top: 0.4rem;
}

.credits {
  display: grid;
  grid-template-columns: minmax(5rem, auto) minmax(0, 1fr);
  gap: 0.62rem 0.85rem;
  margin: 1.5rem 0 0;
  border-top: 1px solid var(--music-border);
  padding-top: 1.25rem;
  font-size: 0.76rem;
}

.credits dt {
  color: var(--va-c-text-2);
  font-weight: 600;
}

.credits dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: var(--va-c-text);
}

.credits a {
  color: var(--va-c-primary);
  text-decoration: none;
}

.credits a:hover {
  text-decoration: underline;
}

.separator {
  color: var(--va-c-text-2);
}

@keyframes loading-spin {
  from { transform: translate(-50%, -50%) rotate(0); }
  to { transform: translate(-50%, -50%) rotate(1turn); }
}

@media (width < 1200px) and (width >= 768px) {
  .now-playing {
    border-top: 1px solid var(--music-border);
    border-left: 0;
  }
}

@media (width < 768px) {
  .now-playing {
    height: auto;
    border-left: 0;
  }

  .now-playing__scroll {
    height: auto;
    overflow: visible;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-icon {
    animation: none;
  }
}
</style>
