<script setup lang="ts">
import type { Song, SongKind } from './music'
import MusicCover from './MusicCover.vue'
import { nextTick, onMounted, ref, watch } from 'vue'

export interface YearOption {
  year: number
  count: number
}

const props = defineProps<{
  songs: Song[]
  total: number
  currentId: string
  search: string
  kind: SongKind | 'all'
  year: number | null
  years: YearOption[]
  hasPlayableAudio: (song: Song) => boolean
}>()

const emit = defineEmits<{
  select: [song: Song]
  'update:search': [value: string]
  'update:kind': [value: SongKind | 'all']
  'update:year': [value: number | null]
}>()

const list = ref<HTMLElement | null>(null)
const hasMounted = ref(false)

async function revealCurrentTrack(id: string) {
  await nextTick()
  const scroller = list.value
  const target = scroller?.querySelector<HTMLElement>(`[data-track-id="${id}"]`)
  if (!scroller || !target)
    return

  const scrollerRect = scroller.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  if (targetRect.top < scrollerRect.top) {
    scroller.scrollTop -= scrollerRect.top - targetRect.top
  }
  else if (targetRect.bottom > scrollerRect.bottom) {
    scroller.scrollTop += targetRect.bottom - scrollerRect.bottom
  }
}

watch(() => props.currentId, revealCurrentTrack)

onMounted(() => {
  hasMounted.value = true
  void revealCurrentTrack(props.currentId)
})

function onSearch(event: Event) {
  emit('update:search', (event.target as HTMLInputElement).value)
}

function selectKind(value: SongKind | 'all') {
  emit('update:kind', value)
}

function selectYear(value: number | null) {
  emit('update:year', value)
}

const kindOptions: Array<{ value: SongKind | 'all', label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'solo', label: '独唱' },
  { value: 'collaboration', label: '合作' },
  { value: 'band', label: '乐队' },
  { value: 'instrumental', label: '演奏' },
]
</script>

<template>
  <section class="track-panel" aria-label="歌曲库">
    <header class="track-panel__header">
      <div>
        <p class="eyebrow">Music Library</p>
        <p class="track-count">{{ songs.length }} / {{ total }} 首</p>
      </div>
      <div class="filter-controls">
        <div class="filter-menu">
          <button
            type="button"
            class="filter-trigger"
            aria-haspopup="listbox"
            :title="`作品类型：${kindOptions.find(option => option.value === kind)?.label || '全部'}`"
          >
            <span class="i-ri-disc-line" aria-hidden="true" />
            <span>类型</span>
          </button>
          <div class="filter-popover" role="listbox" aria-label="作品类型">
            <button
              v-for="option in kindOptions"
              :key="option.value"
              type="button"
              role="option"
              :aria-selected="kind === option.value"
              :class="{ selected: kind === option.value }"
              @click="selectKind(option.value)"
            >
              <span>{{ option.label }}</span>
              <span v-if="kind === option.value" class="i-ri-check-line" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="filter-menu">
          <button
            type="button"
            class="filter-trigger"
            aria-haspopup="listbox"
            :title="`发布时间：${year ?? '全部年份'}`"
          >
            <span class="i-ri-calendar-event-line" aria-hidden="true" />
            <span>时间</span>
          </button>
          <div class="filter-popover filter-popover--years" role="listbox" aria-label="发布年份">
            <button
              type="button"
              role="option"
              :aria-selected="year === null"
              :class="{ selected: year === null }"
              @click="selectYear(null)"
            >
              <span>全部年份 · {{ total }}</span>
              <span v-if="year === null" class="i-ri-check-line" aria-hidden="true" />
            </button>
            <button
              v-for="option in years"
              :key="option.year"
              type="button"
              role="option"
              :aria-selected="year === option.year"
              :class="{ selected: year === option.year }"
              @click="selectYear(option.year)"
            >
              <span>{{ option.year }} · {{ option.count }} 首</span>
              <span v-if="year === option.year" class="i-ri-check-line" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <label class="search-box">
      <span class="sr-only">搜索歌曲、演唱者或制作人员</span>
      <span class="i-ri-search-line" aria-hidden="true" />
      <input
        type="search"
        :value="search"
        placeholder="搜索歌曲、Vocal、制作人员"
        autocomplete="off"
        @input="onSearch"
      >
    </label>

    <div ref="list" class="track-list" role="list">
      <button
        v-for="song in songs"
        :key="song.id"
        type="button"
        role="listitem"
        class="track-item"
        :class="{ active: hasMounted && currentId === song.id }"
        :data-track-id="song.id"
        :aria-current="hasMounted && currentId === song.id ? 'true' : undefined"
        @click="emit('select', song)"
      >
        <span class="track-cover-wrap">
          <MusicCover
            class="track-cover"
            :song="song"
          />
        </span>
        <span class="track-copy">
          <strong>{{ song.title }}</strong>
          <span>{{ song.artists.join(' / ') }}</span>
          <time :datetime="song.date">{{ song.date.replaceAll('-', '.') }}</time>
        </span>
        <span v-if="!hasPlayableAudio(song)" class="archive-only" title="仅档案">档案</span>
      </button>

      <div v-if="!songs.length" class="empty-state">
        <span class="i-ri-disc-line" aria-hidden="true" />
        <p>没有找到符合条件的作品</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.track-panel {
  --track-scroll-thumb: rgb(var(--va-c-primary-rgb), 0);

  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--music-border);
  background: var(--music-panel);
}

.track-panel__header {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 0.75rem;
}

.eyebrow {
  margin: 0;
  color: var(--va-c-primary);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.track-count {
  margin: 0 0 0;
  color: var(--va-c-text-2);
  font-size: 0.78rem;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 1rem 0.8rem;
  border: 1px solid var(--music-border);
  border-radius: 0.8rem;
  padding: 0.65rem 0.75rem;
  color: var(--va-c-text-2);
  background: var(--music-control);
  transition: border-color var(--va-transition-duration-fast), box-shadow var(--va-transition-duration-fast);
}

.search-box:focus-within {
  border-color: var(--va-c-primary);
  box-shadow: 0 0 0 3px rgb(var(--va-c-primary-rgb), 0.12);
}

.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: var(--va-c-text);
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
}

.filter-controls {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 0.35rem;
}

.filter-menu {
  position: relative;
}

.filter-menu::after {
  position: absolute;
  top: 100%;
  right: -0.5rem;
  left: -0.5rem;
  height: 0.45rem;
  content: '';
}

.filter-trigger {
  display: flex;
  width: 3.5rem;
  min-height: 3.35rem;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.2rem;
  border: 0;
  border-radius: 0.7rem;
  padding: 0.35rem;
  color: var(--va-c-text-2);
  background: transparent;
  font: inherit;
  font-size: 0.66rem;
  cursor: pointer;
  transition: color var(--va-transition-duration-fast), background-color var(--va-transition-duration-fast);
}

.filter-trigger > span:first-child {
  font-size: 1.22rem;
}

.filter-menu:hover .filter-trigger,
.filter-menu:focus-within .filter-trigger {
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.1);
}

.filter-trigger:focus-visible {
  outline: 3px solid rgb(var(--va-c-primary-rgb), 0.14);
  outline-offset: 2px;
}

.filter-popover {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 50%;
  display: flex;
  width: max-content;
  min-width: 8.5rem;
  max-height: 16rem;
  flex-direction: column;
  gap: 0.12rem;
  border: 1px solid var(--music-border);
  border-radius: 0.75rem;
  padding: 0.35rem;
  overflow-y: auto;
  color: var(--va-c-text);
  background: color-mix(in srgb, var(--va-c-bg) 94%, transparent);
  box-shadow: 0 0.9rem 2.2rem rgb(0 0 0 / 0.16);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 0.35rem);
  visibility: hidden;
  backdrop-filter: blur(18px);
  scrollbar-color: color-mix(in srgb, var(--va-c-primary) 55%, transparent) transparent;
  scrollbar-width: thin;
  transition: opacity var(--va-transition-duration-fast), transform var(--va-transition-duration-fast), visibility var(--va-transition-duration-fast);
}

.filter-popover::-webkit-scrollbar,
.track-list::-webkit-scrollbar {
  width: 6px;
}

.filter-popover::-webkit-scrollbar-track,
.track-list::-webkit-scrollbar-track {
  background: transparent;
}

.filter-popover::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background-color: color-mix(in srgb, var(--va-c-primary) 55%, transparent);
}

.filter-popover--years {
  min-width: 10rem;
}

.filter-menu:last-child .filter-popover {
  right: 0;
  left: auto;
  transform: translate(0, 0.35rem);
}

.filter-menu:hover .filter-popover,
.filter-menu:focus-within .filter-popover {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, 0);
  visibility: visible;
}

.filter-menu:last-child:hover .filter-popover,
.filter-menu:last-child:focus-within .filter-popover {
  transform: translate(0, 0);
}

.filter-popover button {
  display: flex;
  min-height: 2.2rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.45rem 0.62rem;
  text-align: left;
  color: var(--va-c-text-2);
  background: transparent;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
}

.filter-popover button:hover,
.filter-popover button:focus-visible,
.filter-popover button.selected {
  color: var(--va-c-primary);
  background: rgb(var(--va-c-primary-rgb), 0.1);
  outline: 0;
}

.track-list {
  height: 0;
  min-height: 0;
  flex: 1 1 0;
  padding: 0.15rem 0.55rem 0.75rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--track-scroll-thumb) transparent;
  scrollbar-width: thin;
  transition: scrollbar-color 180ms ease;
}

.track-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background-color: var(--track-scroll-thumb);
  transition: background-color 180ms ease;
}

.track-panel:hover,
.track-panel:focus-within {
  --track-scroll-thumb: rgb(var(--va-c-primary-rgb), 0.55);
}

.track-item {
  position: relative;
  display: grid;
  width: 100%;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.72rem;
  border: 0;
  border-radius: 0.75rem;
  padding: 0.58rem;
  text-align: left;
  color: var(--va-c-text);
  background: transparent;
  cursor: pointer;
  transition: background-color var(--va-transition-duration-fast), transform var(--va-transition-duration-fast);
}

.track-item::before {
  position: absolute;
  inset: 0.65rem auto 0.65rem 0;
  width: 3px;
  border-radius: 999px;
  background: var(--va-c-primary);
  content: '';
  opacity: 0;
}

.track-item:hover {
  background: rgb(var(--va-c-primary-rgb), 0.07);
}

.track-item:active {
  transform: scale(0.99);
}

.track-item.active {
  background: rgb(var(--va-c-primary-rgb), 0.12);
}

.track-item.active::before {
  opacity: 1;
}

.track-cover-wrap {
  position: relative;
  display: block;
  width: 48px;
  height: 48px;
}

.track-cover {
  width: 48px;
  height: 48px;
  border-radius: 0.58rem;
  object-fit: cover;
  background: var(--va-c-bg-soft);
}

.track-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.track-copy strong,
.track-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-copy strong {
  font-size: 0.86rem;
  font-weight: 700;
}

.track-copy span,
.track-copy time {
  color: var(--va-c-text-2);
  font-size: 0.7rem;
}

.archive-only {
  border: 1px solid var(--music-border);
  border-radius: 999px;
  padding: 0.15rem 0.38rem;
  color: var(--va-c-text-2);
  font-size: 0.62rem;
}

.empty-state {
  display: grid;
  min-height: 12rem;
  place-content: center;
  text-align: center;
  color: var(--va-c-text-2);
}

.empty-state span {
  margin: auto;
  font-size: 2rem;
}

.empty-state p {
  margin: 0.6rem 0 0;
  font-size: 0.82rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (width < 768px) {
  .track-panel {
    height: auto;
    border-top: 1px solid var(--music-border);
    border-right: 0;
  }

  .track-list {
    height: 28rem;
    max-height: 28rem;
    flex: 0 0 28rem;
    overflow-y: auto;
  }

}

@media (prefers-reduced-motion: reduce) {
  .track-item,
  .search-box,
  .filter-trigger,
  .filter-popover {
    transition: none;
  }
}
</style>
