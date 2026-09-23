<script setup lang="ts">
import type { LyricLine, Song } from './music'
import { handleSongCoverError } from './covers'
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  song: Song
  cover: string
  isPlaying: boolean
  lyrics: LyricLine[]
  activeLyricIndex: number
  lyricsLoading: boolean
}>()

const lyricScroller = ref<HTMLElement | null>(null)

watch(() => props.activeLyricIndex, async (index) => {
  if (index < 0)
    return
  await nextTick()
  const scroller = lyricScroller.value
  const target = scroller?.querySelector<HTMLElement>(`[data-lyric-index="${index}"]`)
  if (!scroller || !target)
    return

  const scrollerRect = scroller.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const targetTop = scroller.scrollTop
    + targetRect.top
    - scrollerRect.top
    - (scroller.clientHeight - targetRect.height) / 2

  scroller.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth',
  })
})
</script>

<template>
  <section class="album-visual" aria-label="当前歌曲封面与歌词">
    <div class="visual-area">
      <div class="album-stage" :class="{ playing: isPlaying }">
        <div class="vinyl" aria-hidden="true">
          <span class="vinyl__label" />
        </div>
        <img
          class="album-cover"
          :src="cover"
          :alt="`${song.title} 封面`"
          width="520"
          height="520"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="handleSongCoverError"
        >
      </div>
    </div>

    <div class="lyrics-area">
      <div ref="lyricScroller" class="lyrics-scroll" aria-live="polite">
        <div v-if="lyricsLoading" class="lyrics-empty">
          <span class="i-ri-loader-4-line lyrics-loading" aria-hidden="true" />
          <p>正在获取歌词…</p>
        </div>
        <div v-else-if="lyrics.length" class="lyric-lines">
          <p
            v-for="(line, index) in lyrics"
            :key="`${line.start}-${index}`"
            :data-lyric-index="index"
            :class="{ active: activeLyricIndex === index }"
          >
            {{ line.text }}
          </p>
        </div>
        <div v-else class="lyrics-empty">
          <span class="i-ri-file-text-line" aria-hidden="true" />
          <p>暂无歌词</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.album-visual {
  position: relative;
  z-index: 1;
  display: grid;
  height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-rows: minmax(18rem, 54%) minmax(10rem, 34%);
  align-content: start;
  overflow: hidden;
}

.visual-area {
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 1.6rem 2rem;
}

.album-stage {
  position: relative;
  width: clamp(14rem, 18vw, 19rem);
  flex: 0 0 auto;
  aspect-ratio: 1;
  isolation: isolate;
  transform: translateY(0.8rem);
}

.album-cover {
  position: absolute;
  z-index: 2;
  inset: 0 auto auto 0;
  width: 88%;
  height: 88%;
  border: 0;
  border-radius: 1.1rem;
  object-fit: cover;
  background: var(--va-c-bg-soft);
  box-shadow: 0 1.5rem 3.5rem rgb(0 0 0 / 0.25);
}

:global(html.dark) .album-cover {
  box-shadow: 0 1.5rem 3.5rem rgb(255 255 255 / 0.16);
}

.vinyl {
  position: absolute;
  z-index: 1;
  top: 7%;
  right: -5%;
  width: 86%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, transparent 0 7%, #d6a85d 7.5% 16%, #111 16.5% 19%, transparent 19.5%),
    repeating-radial-gradient(circle at center, #171717 0 3px, #242424 4px 5px, #111 6px 8px);
  box-shadow: 0 1.1rem 2.8rem rgb(0 0 0 / 0.28);
  animation: vinyl-spin 16s linear infinite;
  animation-play-state: paused;
}

.playing .vinyl {
  animation-play-state: running;
}

.vinyl::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: conic-gradient(from 25deg, transparent, rgb(255 255 255 / 0.12), transparent 18%, transparent 55%, rgb(255 255 255 / 0.08), transparent 72%);
  content: '';
}

.vinyl__label {
  position: absolute;
  z-index: 2;
  inset: 42%;
  border: 3px solid rgb(255 255 255 / 0.35);
  border-radius: 50%;
  background: var(--va-c-primary);
}

.lyrics-area {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.lyrics-scroll {
  height: 100%;
  min-height: 0;
  flex: 1;
  padding: 0 1.25rem;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

.lyric-lines {
  min-height: 100%;
  padding: 0.75rem 0 3rem;
}

.lyric-lines p {
  margin: 0;
  padding: 0.5rem 0;
  text-align: center;
  color: var(--va-c-text-2);
  font-size: 0.82rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: break-word;
  transition: color 180ms ease, transform 180ms ease, font-size 180ms ease;
}

.lyric-lines p.active {
  color: var(--va-c-text);
  font-size: 0.96rem;
  font-weight: 700;
  transform: scale(1.02);
}

.lyrics-empty {
  display: grid;
  box-sizing: border-box;
  min-height: 100%;
  place-content: start center;
  padding-top: 1.5rem;
  text-align: center;
  color: var(--va-c-text-2);
}

.lyrics-empty > span {
  margin: auto;
  font-size: 1.4rem;
}

.lyrics-empty p {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
}

.lyrics-loading {
  animation: vinyl-spin 1s linear infinite;
}

@keyframes vinyl-spin {
  to { transform: rotate(1turn); }
}

@media (width < 768px) {
  .album-visual {
    height: auto;
    grid-template-rows: auto clamp(5rem, 32vh, 10rem);
  }

  .visual-area {
    padding: 2rem 1rem 1.2rem;
  }

  .album-stage {
    width: min(76vw, 21rem);
    transform: translateY(0.4rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vinyl,
  .lyrics-loading {
    animation: none;
  }

  .lyric-lines p {
    transition: none;
  }
}
</style>
