import type { Ref } from 'vue'
import type { MetadataSource, PlayableTrack, SongVersion, TrackMetadata } from './music'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LruCache } from './lru'

const METADATA_CACHE_SIZE = 32

interface CachedMetadata {
  value: TrackMetadata
  lyricsLoaded: boolean
}

const metadataCache = new LruCache<string, CachedMetadata>(METADATA_CACHE_SIZE)
const pendingRequests = new Map<string, Promise<TrackMetadata>>()

export function emptyTrackMetadata(): TrackMetadata {
  return { lyrics: [] }
}

function getVersionMetadataKey(item: SongVersion) {
  const sources = item.metadataSources.map(metadataSourceKey).join('|')
  const lyricSource = item.lyricSource ? metadataSourceKey(item.lyricSource) : ''
  return `${item.id}|${sources}|lyrics:${lyricSource}`
}

function metadataSourceKey(source: MetadataSource) {
  return source.type === 'netease'
    ? `n:${source.songId}`
    : `b:${source.bvid}:p${source.page || 1}`
}

function metadataUrl(sources: MetadataSource[], includeLyrics: boolean) {
  const endpoint = import.meta.env.VITE_MUSIC_METADATA_API || '/api/music-metadata'
  const url = new URL(endpoint, window.location.origin)
  const netease = sources.find(source => source.type === 'netease')
  const bilibili = sources.find(source => source.type === 'bilibili')
  if (netease?.type === 'netease')
    url.searchParams.set('neteaseId', netease.songId)
  if (bilibili?.type === 'bilibili') {
    url.searchParams.set('bvid', bilibili.bvid)
    url.searchParams.set('page', String(bilibili.page || 1))
  }
  if (!includeLyrics)
    url.searchParams.set('lyrics', '0')
  return url
}

async function requestMetadata(sources: MetadataSource[], includeLyrics: boolean) {
  const response = await fetch(metadataUrl(sources, includeLyrics))
  if (!response.ok)
    throw new Error(`Metadata request failed: ${response.status}`)
  return normalizeMetadata(await response.json() as Partial<TrackMetadata>)
}

function normalizeMetadata(value: Partial<TrackMetadata>): TrackMetadata {
  return {
    ...(typeof value.title === 'string' && value.title.trim() ? { title: value.title.trim() } : {}),
    ...(typeof value.artist === 'string' && value.artist.trim() ? { artist: value.artist.trim() } : {}),
    ...(typeof value.cover === 'string' && value.cover.trim() ? { cover: value.cover.trim() } : {}),
    lyrics: Array.isArray(value.lyrics) ? value.lyrics : [],
  }
}

export async function loadVersionMetadata(item: SongVersion, includeLyrics = false) {
  const key = getVersionMetadataKey(item)
  const cached = metadataCache.get(key)
  if (cached && (!includeLyrics || cached.lyricsLoaded))
    return cached.value

  if (!item.metadataSources.length && (!includeLyrics || !item.lyricSource)) {
    const empty = emptyTrackMetadata()
    metadataCache.set(key, { value: empty, lyricsLoaded: includeLyrics })
    return empty
  }

  const requestKey = `${key}|lyrics:${includeLyrics ? '1' : '0'}`
  let pending = pendingRequests.get(requestKey)
  if (!pending) {
    pending = (async () => {
      const [incoming, customLyrics] = await Promise.all([
        item.metadataSources.length
          ? requestMetadata(item.metadataSources, includeLyrics && !item.lyricSource)
          : Promise.resolve(emptyTrackMetadata()),
        includeLyrics && item.lyricSource
          ? requestMetadata([item.lyricSource], true)
          : Promise.resolve(null),
      ])
      const previous = metadataCache.get(key)
      const value: TrackMetadata = {
        ...previous?.value,
        ...incoming,
        lyrics: includeLyrics
          ? (customLyrics?.lyrics || incoming.lyrics)
          : (previous?.value.lyrics || []),
      }
      metadataCache.set(key, {
        value,
        lyricsLoaded: includeLyrics || Boolean(previous?.lyricsLoaded),
      })
      return value
    })().finally(() => pendingRequests.delete(requestKey))
    pendingRequests.set(requestKey, pending)
  }
  return await pending
}

export function useSongMetadata(
  track: Ref<PlayableTrack | null>,
  item: Ref<SongVersion | null>,
  currentTime: Ref<number>,
  enabled?: Ref<boolean>,
) {
  const metadata = ref<TrackMetadata>(emptyTrackMetadata())
  const isLoading = ref(false)
  let requestVersion = 0
  let stopWatch: (() => void) | null = null

  const activeLyricIndex = computed(() => {
    const lines = metadata.value.lyrics
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (currentTime.value >= lines[index].start)
        return index
    }
    return -1
  })

  const currentLyric = computed(() => {
    if (isLoading.value)
      return '歌词加载中…'
    if (metadata.value.lyrics.length && activeLyricIndex.value < 0)
      return ''
    return metadata.value.lyrics[activeLyricIndex.value]?.text || '暂无歌词'
  })

  async function load() {
    const request = ++requestVersion
    const currentTrack = track.value
    const currentVersion = item.value
    if (!currentTrack || !currentVersion || enabled?.value === false) {
      metadata.value = emptyTrackMetadata()
      isLoading.value = false
      return
    }

    isLoading.value = true
    metadata.value = emptyTrackMetadata()
    try {
      const result = await loadVersionMetadata(currentVersion, true)
      if (request === requestVersion && track.value?.id === currentTrack.id && item.value?.id === currentVersion.id)
        metadata.value = result
    }
    catch (error) {
      if (request === requestVersion) {
        console.warn('[music-metadata] failed to load track metadata', error)
        metadata.value = emptyTrackMetadata()
      }
    }
    finally {
      if (request === requestVersion)
        isLoading.value = false
    }
  }

  onMounted(() => {
    stopWatch = watch(
      () => [track.value?.id, item.value?.id, enabled?.value] as const,
      () => void load(),
      { immediate: true },
    )
  })

  onBeforeUnmount(() => {
    requestVersion += 1
    stopWatch?.()
  })

  return { metadata, activeLyricIndex, currentLyric, isLoading }
}
