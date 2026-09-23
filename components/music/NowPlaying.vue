<script setup lang="ts">
import type { Song } from './music'
import type { PlaybackMode } from './useGlobalMusicPlayer'
import { computed } from 'vue'
import PlaybackModeIcon from './PlaybackModeIcon.vue'
import VolumeIcon from './VolumeIcon.vue'
import { formatPlaybackTime, getPlatformIcon, getPlaybackProgress } from './music'
import { PLAYBACK_MODE_LABELS } from './useGlobalMusicPlayer'

const props = defineProps<{
  song: Song
  versionIndex: number
  isActive: boolean
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
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
  'select-version': [index: number]
  'open-video': []
}>()

const progressMax = computed(() => Math.max(props.duration, 0))
const progressPercent = computed(() => getPlaybackProgress(props.currentTime, props.duration))
const playbackModeLabel = computed(() => PLAYBACK_MODE_LABELS[props.playbackMode])

const displayLinks = computed(() => (props.song.links || []).map(link => ({
  ...link,
  displayLabel: link.label
    .replace(/^(?:Bilibili|网易云音乐|网易云|QQ\s*音乐|AcFun|YouTube)(?:\s*[·｜|/—-]\s*)?/i, '')
    .trim(),
})))

function onSeek(event: Event) {
  emit('seek', Number((event.target as HTMLInputElement).value))
}

function onVolumeInput(event: Event) {
  emit('set-volume', Number((event.target as HTMLInputElement).value))
}

</script>

<template>
  <section class="now-playing" aria-label="当前歌曲详情">
    <div class="now-playing__scroll">
      <h2>{{ song.title }}</h2>
      <p class="artists">{{ song.artists.join(' / ') }}</p>
      <time :datetime="song.date">{{ song.date.replaceAll('-', '.') }}</time>

      <div v-if="song.versions.length > 1" class="version-picker">
        <p>版本</p>
        <div>
          <button
            v-for="(item, index) in song.versions"
            :key="item.id"
            type="button"
            :class="{ active: versionIndex === index }"
            :aria-pressed="versionIndex === index"
            @click="emit('select-version', index)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="player-controls">
        <div class="progress-wrap">
          <input
            class="music-progress-slider"
            type="range"
            min="0"
            :max="progressMax"
            :value="Math.min(currentTime, progressMax)"
            step="0.1"
            :disabled="!isActive || !duration"
            :style="{ '--music-progress': `${progressPercent}%` }"
            aria-label="播放进度"
            @input="onSeek"
          >
          <div class="time-row">
            <span>{{ formatPlaybackTime(currentTime) }}</span>
            <span>{{ formatPlaybackTime(duration) }}</span>
          </div>
        </div>

        <div class="control-row">
          <button
            type="button"
            class="mode-button"
            :aria-label="`播放顺序：${playbackModeLabel}。点击切换`"
            :title="playbackModeLabel"
            :disabled="!isActive"
            @click="emit('cycle-mode')"
          >
            <PlaybackModeIcon :mode="playbackMode" mask-id="music-stop-slash-mask" />
          </button>
          <button type="button" class="skip-button" :disabled="!isActive" aria-label="上一首" @click="emit('previous')">
            <span class="i-ri-skip-back-mini-fill" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="play-button"
            :disabled="isLoading && !duration"
            :aria-label="isPlaying ? '暂停' : '播放'"
            @click="emit('toggle')"
          >
            <span v-if="isLoading" class="i-ri-loader-4-line loading-icon" aria-hidden="true" />
            <span v-else :class="isPlaying ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
          </button>
          <button type="button" class="skip-button" :disabled="!isActive" aria-label="下一首" @click="emit('next')">
            <span class="i-ri-skip-forward-mini-fill" aria-hidden="true" />
          </button>
          <div class="music-volume-control">
            <div class="music-volume-popover">
              <input
                class="music-volume-slider"
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
              <VolumeIcon :volume="volume" :is-muted="isMuted" />
            </button>
          </div>
        </div>

        <p v-if="error" class="player-message player-message--error" role="status">{{ error }}</p>
      </div>

      <div v-if="displayLinks.length || song.videos?.length" class="action-row">
        <a
          v-for="link in displayLinks"
          :key="`${link.platform}-${link.url}`"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="link.label"
          :aria-label="link.label"
          :class="{ 'icon-only': !link.displayLabel }"
        >
          <span :class="getPlatformIcon(link.platform)" aria-hidden="true" />
          <span v-if="link.displayLabel">{{ link.displayLabel }}</span>
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
  --music-control-color: #171717;

  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--music-border);
  background: var(--music-panel);
}

:global(html.dark .now-playing) {
  --music-control-color: #fff;
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

h2 {
  margin: 1.5rem 0 0;
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

.version-picker {
  margin-top: 1.4rem;
}

.version-picker p {
  margin: 0 0 0.5rem;
  color: var(--va-c-text-2);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.version-picker > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.version-picker button {
  border: 1px solid var(--music-border);
  border-radius: 999px;
  padding: 0.35rem 0.62rem;
  color: var(--va-c-text-2);
  background: transparent;
  font-size: 0.7rem;
  cursor: pointer;
}

.version-picker button.active {
  border-color: var(--va-c-primary);
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.1);
}

.version-picker button:disabled {
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

:global(html.dark .now-playing .progress-wrap) {
  --music-progress-thumb-shadow: 0 0 0.55rem rgb(255, 242, 223);
}

.music-progress-slider:disabled {
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
  color: var(--music-control-color);
  background: transparent;
  cursor: pointer;
  transition: color var(--va-transition-duration-fast), background-color var(--va-transition-duration-fast), filter var(--va-transition-duration-fast);
}

.skip-button {
  width: 2.6rem;
  height: 2.6rem;
  font-size: 1.45rem;
}

.mode-button {
  width: 2.35rem;
  height: 2.35rem;
  font-size: 1.15rem;
}

.volume-button {
  width: 2.35rem;
  height: 2.35rem;
  font-size: 1.2rem;
}

.volume-button:not(:disabled):hover,
.music-volume-control:focus-within .volume-button {
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.11);
}

.mode-button:not(:disabled):hover,
.mode-button:focus-visible,
.skip-button:not(:disabled):hover,
.skip-button:focus-visible {
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.11);
  outline: none;
}

.mode-button:focus-visible,
.skip-button:focus-visible,
.volume-button:focus-visible {
  box-shadow: 0 0 0 3px rgb(var(--va-c-primary-rgb), 0.18);
}

.play-button {
  position: relative;
  width: 3.35rem;
  height: 3.35rem;
  padding: 0;
  color: #fff !important;
  background: var(--va-c-primary) !important;
  box-shadow: 0 0 1.5rem rgb(var(--va-c-primary-rgb), 0.25);
  font-size: 1.6rem;
  line-height: 1;
}

.play-button:not(:disabled):hover,
.play-button:focus-visible {
  color: #fff !important;
  filter: brightness(1.1);
  outline: none;
}

.play-button:focus-visible {
  box-shadow: 0 0 0 3px rgb(var(--va-c-primary-rgb), 0.18), 0 0 1.5rem rgb(var(--va-c-primary-rgb), 0.25);
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

:global(html.dark .now-playing .control-row button:not(.play-button)) {
  color: #fff !important;
}

:global(html.dark .now-playing .control-row .mode-button:not(:disabled):hover),
:global(html.dark .now-playing .control-row .mode-button:focus-visible),
:global(html.dark .now-playing .control-row .skip-button:not(:disabled):hover),
:global(html.dark .now-playing .control-row .skip-button:focus-visible),
:global(html.dark .now-playing .volume-button:not(:disabled):hover),
:global(html.dark .now-playing .music-volume-control:focus-within .volume-button) {
  color: var(--va-c-primary) !important;
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
