import type { Ref } from 'vue'
import type { Song, SongAudioSource, SongDetail } from './music'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LruCache } from './lru'
import { getBilibiliVideoId, getNeteaseSongId } from './music'

const DETAIL_CACHE_SIZE = 10
const detailCache = new LruCache<string, SongDetail>(DETAIL_CACHE_SIZE)

interface PendingDetailRequest {
  songId: string
  controller: AbortController
  promise: Promise<SongDetail>
  consumers: number
}

interface DetailRequestHandle {
  songId: string
  promise: Promise<SongDetail>
  release: () => void
}

const pendingRequests = new Map<string, PendingDetailRequest>()

function emptyDetail(): SongDetail {
  return {
    lyrics: [],
    lyricSource: 'none',
  }
}

function getMetadataUrl(song: Song) {
  const endpoint = import.meta.env.VITE_MUSIC_METADATA_API || '/api/music-metadata'
  const url = new URL(endpoint, window.location.origin)
  const neteaseId = getNeteaseSongId(song)
  const bvid = getBilibiliVideoId(song)
  if (neteaseId)
    url.searchParams.set('neteaseId', neteaseId)
  if (bvid)
    url.searchParams.set('bvid', bvid)
  return { url, hasRemoteSource: Boolean(neteaseId || bvid) }
}

function normalizeDetail(result: Partial<SongDetail>): SongDetail {
  const lyricSource = result.lyricSource
  return {
    lyrics: Array.isArray(result.lyrics) ? result.lyrics : [],
    lyricSource: lyricSource === 'netease' || lyricSource === 'bilibili' ? lyricSource : 'none',
  }
}

function acquireSongDetail(song: Song): DetailRequestHandle {
  const cached = detailCache.get(song.id)
  if (cached)
    return { songId: song.id, promise: Promise.resolve(cached), release: () => {} }

  let pending = pendingRequests.get(song.id)
  if (!pending) {
    const controller = new AbortController()
    const { url, hasRemoteSource } = getMetadataUrl(song)
    const promise = (async () => {
      if (!hasRemoteSource) {
        const detail = emptyDetail()
        detailCache.set(song.id, detail)
        return detail
      }

      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok)
        throw new Error(`Metadata request failed: ${response.status}`)

      const detail = normalizeDetail(await response.json() as Partial<SongDetail>)
      detailCache.set(song.id, detail)
      return detail
    })().finally(() => {
      if (pendingRequests.get(song.id)?.promise === promise)
        pendingRequests.delete(song.id)
    })

    pending = { songId: song.id, controller, promise, consumers: 0 }
    pendingRequests.set(song.id, pending)
  }

  pending.consumers += 1
  let released = false
  return {
    songId: pending.songId,
    promise: pending.promise,
    release: () => {
      if (released)
        return
      released = true
      pending.consumers -= 1
      if (pending.consumers === 0 && pendingRequests.get(song.id) === pending) {
        pendingRequests.delete(song.id)
        pending.controller.abort()
      }
    },
  }
}

export function useSongMetadata(
  song: Ref<Song>,
  currentTime: Ref<number>,
  currentSource?: Ref<SongAudioSource | null>,
) {
  const metadata = ref<SongDetail>(emptyDetail())
  const isLoading = ref(false)

  let activeRequest: DetailRequestHandle | null = null
  let stopWatch: (() => void) | null = null
  let requestVersion = 0

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
    const version = ++requestVersion
    if (activeRequest && activeRequest.songId !== currentSong.id) {
      activeRequest.release()
      activeRequest = null
    }

    metadata.value = emptyDetail()
    const cached = detailCache.get(currentSong.id)
    if (cached) {
      metadata.value = cached
      isLoading.value = false
      activeRequest = null
      return
    }

    const request = acquireSongDetail(currentSong)
    activeRequest = request
    isLoading.value = true

    try {
      const detail = await request.promise
      if (version === requestVersion && song.value.id === currentSong.id)
        metadata.value = detail
    }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError') && version === requestVersion)
        metadata.value = emptyDetail()
    }
    finally {
      request.release()
      if (version === requestVersion) {
        activeRequest = null
        isLoading.value = false
      }
    }
  }

  function applyMetingMetadata(sourceId: string, _cover: string | null, lyrics: SongDetail['lyrics']) {
    if (currentSource?.value?.id !== sourceId || !lyrics.length)
      return

    const detail: SongDetail = { lyrics, lyricSource: 'netease' }
    metadata.value = detail
    detailCache.set(song.value.id, detail)
  }

  onMounted(() => {
    stopWatch = watch(
      () => song.value.id,
      () => void loadMetadata(song.value),
      { immediate: true },
    )
  })

  onBeforeUnmount(() => {
    requestVersion += 1
    activeRequest?.release()
    activeRequest = null
    stopWatch?.()
  })

  return {
    metadata,
    activeLyricIndex,
    isLoading,
    applyMetingMetadata,
  }
}
