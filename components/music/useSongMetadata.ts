import type { Ref } from 'vue'
import type { Song, SongAudioSource, SongMetadata } from './music'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getBilibiliVideoId, getNeteaseSongId } from './music'

const metadataCache = new Map<string, SongMetadata>()
const coverCache = new Map<string, string>()
const coverRequests = new Map<string, Promise<string>>()

function fallbackMetadata(): SongMetadata {
  return {
    cover: null,
    coverSource: 'fallback',
    lyrics: [],
    lyricSource: 'none',
    audioUrl: null,
    audioSource: 'none',
  }
}

function getMetadataUrl(song: Song, coverOnly = false, preferredNeteaseId?: string | null) {
  const endpoint = import.meta.env.VITE_MUSIC_METADATA_API || '/api/music-metadata'
  const url = new URL(endpoint, window.location.origin)
  const neteaseId = preferredNeteaseId || getNeteaseSongId(song)
  const bvid = getBilibiliVideoId(song)
  if (neteaseId)
    url.searchParams.set('neteaseId', neteaseId)
  if (bvid)
    url.searchParams.set('bvid', bvid)
  if (coverOnly)
    url.searchParams.set('coverOnly', '1')
  return { url, neteaseId, bvid }
}

export function resolveSongCover(song: Song) {
  const cached = coverCache.get(song.id)
  if (cached)
    return Promise.resolve(cached)

  const pending = coverRequests.get(song.id)
  if (pending)
    return pending

  const request = (async () => {
    const { url, neteaseId, bvid } = getMetadataUrl(song, true)
    if (!neteaseId && !bvid)
      return song.cover

    try {
      const response = await fetch(url)
      if (!response.ok)
        return song.cover
      const result = await response.json() as Partial<SongMetadata>
      const cover = typeof result.cover === 'string' ? result.cover : song.cover
      coverCache.set(song.id, cover)
      return cover
    }
    catch {
      return song.cover
    }
    finally {
      coverRequests.delete(song.id)
    }
  })()

  coverRequests.set(song.id, request)
  return request
}

export function useSongMetadata(
  song: Ref<Song>,
  currentTime: Ref<number>,
  currentSource?: Ref<SongAudioSource | null>,
) {
  const metadata = ref<SongMetadata>(fallbackMetadata())
  const isLoading = ref(false)
  const hasLoaded = ref(false)

  let controller: AbortController | null = null
  let stopWatch: (() => void) | null = null
  let metingSourceId: string | null = null
  let resolvedMetingCover: string | null = null
  let resolvedMetingLyrics: SongMetadata['lyrics'] = []

  const cover = computed(() => metadata.value.cover || song.value.cover)
  const activeLyricIndex = computed(() => {
    const lines = metadata.value.lyrics
    if (!lines.length)
      return -1

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (currentTime.value >= lines[index].start)
        return index
    }
    return -1
  })

  async function loadMetadata(currentSong: Song) {
    controller?.abort()
    controller = null
    hasLoaded.value = false

    const preferredNeteaseId = currentSource?.value?.type === 'netease'
      ? currentSource.value.songId
      : null
    const { url, neteaseId, bvid } = getMetadataUrl(currentSong, false, preferredNeteaseId)
    const cacheKey = `${neteaseId || '-'}:${bvid || '-'}`

    const applyMetingOverlay = (base: SongMetadata): SongMetadata => {
      if (!currentSource?.value || currentSource.value.id !== metingSourceId)
        return base
      return {
        ...base,
        cover: resolvedMetingCover || base.cover,
        coverSource: resolvedMetingCover ? 'netease' : base.coverSource,
        lyrics: resolvedMetingLyrics.length ? resolvedMetingLyrics : base.lyrics,
        lyricSource: resolvedMetingLyrics.length ? 'netease' : base.lyricSource,
      }
    }

    metadata.value = applyMetingOverlay(fallbackMetadata())
    if (!neteaseId && !bvid) {
      hasLoaded.value = true
      return
    }

    const cached = metadataCache.get(cacheKey)
    if (cached) {
      metadata.value = applyMetingOverlay(cached)
      hasLoaded.value = true
      return
    }

    isLoading.value = true
    const activeController = new AbortController()
    controller = activeController

    try {
      const response = await fetch(url, { signal: activeController.signal })
      if (!response.ok)
        throw new Error(`Metadata request failed: ${response.status}`)

      const result = await response.json() as Partial<SongMetadata>
      const resolved: SongMetadata = {
        cover: typeof result.cover === 'string' ? result.cover : null,
        coverSource: result.coverSource || 'fallback',
        lyrics: Array.isArray(result.lyrics) ? result.lyrics : [],
        lyricSource: result.lyricSource || 'none',
        audioUrl: typeof result.audioUrl === 'string' ? result.audioUrl : null,
        audioSource: result.audioSource || 'none',
      }
      metadataCache.set(cacheKey, resolved)
      if (resolved.cover)
        coverCache.set(currentSong.id, resolved.cover)

      if (song.value.id === currentSong.id) {
        metadata.value = applyMetingOverlay(resolved)
      }
    }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError') && song.value.id === currentSong.id)
        metadata.value = applyMetingOverlay(fallbackMetadata())
    }
    finally {
      if (controller === activeController) {
        controller = null
        isLoading.value = false
        hasLoaded.value = true
      }
    }
  }

  function applyMetingMetadata(sourceId: string, metingCover: string | null, lyrics: SongMetadata['lyrics']) {
    if (currentSource?.value?.id !== sourceId)
      return

    if (metingSourceId !== sourceId) {
      resolvedMetingCover = null
      resolvedMetingLyrics = []
    }
    metingSourceId = sourceId
    if (metingCover)
      resolvedMetingCover = metingCover
    if (lyrics.length)
      resolvedMetingLyrics = lyrics

    metadata.value = {
      ...metadata.value,
      cover: metingCover || metadata.value.cover,
      coverSource: metingCover ? 'netease' : metadata.value.coverSource,
      lyrics: lyrics.length ? lyrics : metadata.value.lyrics,
      lyricSource: lyrics.length ? 'netease' : metadata.value.lyricSource,
    }
    if (metingCover)
      coverCache.set(song.value.id, metingCover)
  }

  onMounted(() => {
    stopWatch = watch(
      () => [song.value.id, currentSource?.value?.id],
      () => void loadMetadata(song.value),
      { immediate: true },
    )
  })

  onBeforeUnmount(() => {
    controller?.abort()
    stopWatch?.()
  })

  return {
    metadata,
    cover,
    activeLyricIndex,
    isLoading,
    hasLoaded,
    applyMetingMetadata,
  }
}
