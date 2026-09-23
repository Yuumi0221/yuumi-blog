import type { PlaybackCandidate, PlayableTrack } from './music'
import { computed, ref, shallowRef } from 'vue'

export type PlaybackMode = 'list' | 'one' | 'random' | 'stop'

const SETTINGS_KEY = 'yuumi-global-music-settings-v1'
const LOAD_TIMEOUT_MS = 10_000
const UNAVAILABLE_MESSAGE = '暂时无法播放，请稍后重试'
const PLAYBACK_MODES: PlaybackMode[] = ['list', 'one', 'random', 'stop']

interface RegisteredTrack {
  token: symbol
  getTrack: () => PlayableTrack
  getElement: () => HTMLElement | null
}

const queue = shallowRef<PlayableTrack[]>([])
const contextId = ref<string | null>(null)
const currentIndex = ref(-1)
const currentVersionIndex = ref(0)
const currentCandidateIndex = ref(0)
const playbackMode = ref<PlaybackMode>('list')
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.7)
const isMuted = ref(false)
const isCollapsed = ref(false)
const isPlaying = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const audio = shallowRef<HTMLAudioElement | null>(null)

const registry = new Map<string, Map<symbol, RegisteredTrack>>()
let settingsLoaded = false
let loadGeneration = 0
let loadTimer: ReturnType<typeof setTimeout> | null = null
let pendingAutoplay = false
let suppressAudioError = false
let playbackIntent = false

const currentTrack = computed(() => queue.value[currentIndex.value] || null)
const currentVersion = computed(() => currentTrack.value?.versions[currentVersionIndex.value] || null)
const currentCandidate = computed(() => currentVersion.value?.playbackCandidates[currentCandidateIndex.value] || null)
const hasTrack = computed(() => Boolean(currentTrack.value))

function cloneTrack(track: PlayableTrack): PlayableTrack {
  return {
    ...track,
    artists: [...track.artists],
    versions: track.versions.map(item => ({
      ...item,
      metadataSources: item.metadataSources.map(source => ({ ...source })),
      lyricSource: item.lyricSource ? { ...item.lyricSource } : undefined,
      playbackCandidates: item.playbackCandidates.map(candidate => ({ ...candidate })),
    })),
  }
}

function saveSettings() {
  if (typeof window === 'undefined')
    return
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      volume: volume.value,
      isMuted: isMuted.value,
      playbackMode: playbackMode.value,
      isCollapsed: isCollapsed.value,
    }))
  }
  catch {
    // Private browsing can disable storage without affecting playback.
  }
}

function initializeSettings() {
  if (settingsLoaded || typeof window === 'undefined')
    return
  settingsLoaded = true
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') as Record<string, unknown>
    if (typeof saved.volume === 'number' && Number.isFinite(saved.volume))
      volume.value = Math.min(1, Math.max(0, saved.volume))
    if (typeof saved.isMuted === 'boolean')
      isMuted.value = saved.isMuted
    if (PLAYBACK_MODES.includes(saved.playbackMode as PlaybackMode))
      playbackMode.value = saved.playbackMode as PlaybackMode
    if (typeof saved.isCollapsed === 'boolean')
      isCollapsed.value = saved.isCollapsed
  }
  catch {
    // Invalid legacy settings are ignored.
  }
}

function attachAudio(element: HTMLAudioElement | null) {
  initializeSettings()
  audio.value = element
  if (!element)
    return
  element.volume = volume.value
  element.muted = isMuted.value
}

function clearLoadTimer() {
  if (loadTimer)
    clearTimeout(loadTimer)
  loadTimer = null
}

function candidateUrl(candidate: PlaybackCandidate) {
  if (candidate.type === 'url')
    return candidate.url
  if (candidate.type === 'netease')
    return `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(candidate.songId)}.mp3`
  const params = new URLSearchParams({
    bvid: candidate.bvid,
    page: String(candidate.page || 1),
  })
  return `/api/bilibili-audio?${params.toString()}`
}

function resetTimeline() {
  currentTime.value = 0
  duration.value = 0
}

function stopAudio() {
  loadGeneration += 1
  clearLoadTimer()
  pendingAutoplay = false
  playbackIntent = false
  const element = audio.value
  if (!element)
    return
  suppressAudioError = true
  element.pause()
  element.removeAttribute('src')
  element.load()
  queueMicrotask(() => {
    suppressAudioError = false
  })
  isPlaying.value = false
  isLoading.value = false
}

function handlePlayRejection(reason: unknown) {
  console.warn('[music-player] browser rejected playback', reason)
  isPlaying.value = false
  isLoading.value = false
  playbackIntent = false
  error.value = '播放未开始，请再次点击播放'
}

function prepareCandidate(autoplay: boolean) {
  const element = audio.value
  const candidate = currentCandidate.value
  if (!element || !candidate) {
    isLoading.value = false
    error.value = UNAVAILABLE_MESSAGE
    return
  }

  const generation = ++loadGeneration
  clearLoadTimer()
  pendingAutoplay = autoplay
  playbackIntent = autoplay
  error.value = null
  isLoading.value = true
  resetTimeline()
  element.src = candidateUrl(candidate)
  element.load()
  loadTimer = setTimeout(() => {
    if (generation === loadGeneration)
      failCurrentCandidate('initial load timeout')
  }, LOAD_TIMEOUT_MS)
}

function failCurrentCandidate(reason: unknown) {
  const failed = currentCandidate.value
  console.warn('[music-player] playback candidate failed', {
    trackId: currentTrack.value?.id,
    versionId: currentVersion.value?.id,
    candidateType: failed?.type,
    reason,
  })
  clearLoadTimer()

  const candidates = currentVersion.value?.playbackCandidates || []
  if (currentCandidateIndex.value + 1 < candidates.length) {
    currentCandidateIndex.value += 1
    prepareCandidate(playbackIntent)
    return
  }

  audio.value?.pause()
  pendingAutoplay = false
  playbackIntent = false
  isPlaying.value = false
  isLoading.value = false
  error.value = UNAVAILABLE_MESSAGE
}

function onLoadedMetadata() {
  clearLoadTimer()
  const element = audio.value
  if (!element)
    return
  duration.value = Number.isFinite(element.duration) ? element.duration : 0
  isLoading.value = false
  if (pendingAutoplay) {
    pendingAutoplay = false
    void element.play().catch(handlePlayRejection)
  }
}

function onCanPlay() {
  clearLoadTimer()
  isLoading.value = false
}

function onTimeUpdate() {
  const element = audio.value
  if (!element)
    return
  currentTime.value = Number.isFinite(element.currentTime) ? element.currentTime : 0
  if (Number.isFinite(element.duration))
    duration.value = element.duration
}

function onPlay() {
  playbackIntent = true
  isPlaying.value = true
  isLoading.value = false
  error.value = null
}

function onPause() {
  isPlaying.value = false
}

function onWaiting() {
  if (currentTrack.value)
    isLoading.value = true
}

function onAudioError() {
  if (!suppressAudioError && currentTrack.value)
    failCurrentCandidate(audio.value?.error?.message || 'media error')
}

function setTrackIndex(index: number, autoplay: boolean) {
  if (index < 0 || index >= queue.value.length)
    return
  stopAudio()
  currentIndex.value = index
  currentVersionIndex.value = 0
  currentCandidateIndex.value = 0
  error.value = null
  prepareCandidate(autoplay)
}

function playQueueTrack(index: number) {
  setTrackIndex(index, true)
}

function playSnapshot(nextContextId: string, tracks: PlayableTrack[], trackId: string, versionIndex = 0) {
  const snapshot = tracks.map(cloneTrack)
  const index = snapshot.findIndex(track => track.id === trackId)
  if (index < 0)
    return

  stopAudio()
  queue.value = snapshot
  contextId.value = nextContextId
  currentIndex.value = index
  currentVersionIndex.value = Math.min(
    Math.max(0, versionIndex),
    Math.max(0, snapshot[index].versions.length - 1),
  )
  currentCandidateIndex.value = 0
  error.value = null
  prepareCandidate(true)
}

function togglePlayback() {
  const element = audio.value
  if (!element || !currentTrack.value)
    return
  if (error.value === UNAVAILABLE_MESSAGE) {
    currentCandidateIndex.value = 0
    prepareCandidate(true)
    return
  }
  if (!element.src) {
    currentCandidateIndex.value = 0
    prepareCandidate(true)
    return
  }
  if (!element.paused) {
    playbackIntent = false
    element.pause()
    return
  }
  error.value = null
  void element.play().catch(handlePlayRejection)
}

function selectVersion(index: number) {
  const track = currentTrack.value
  if (!track || index < 0 || index >= track.versions.length || index === currentVersionIndex.value)
    return
  const autoplay = isPlaying.value
  stopAudio()
  currentVersionIndex.value = index
  currentCandidateIndex.value = 0
  error.value = null
  prepareCandidate(autoplay)
}

function seek(time: number) {
  const element = audio.value
  if (!element || !Number.isFinite(time))
    return
  const target = Math.min(Math.max(0, time), Number.isFinite(element.duration) ? element.duration : time)
  element.currentTime = target
  currentTime.value = target
}

function setVolume(nextVolume: number) {
  const normalized = Math.min(1, Math.max(0, nextVolume))
  volume.value = normalized
  if (audio.value)
    audio.value.volume = normalized
  if (normalized > 0 && isMuted.value) {
    isMuted.value = false
    if (audio.value)
      audio.value.muted = false
  }
  saveSettings()
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (audio.value)
    audio.value.muted = isMuted.value
  saveSettings()
}

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value
  saveSettings()
}

function cyclePlaybackMode() {
  const index = PLAYBACK_MODES.indexOf(playbackMode.value)
  playbackMode.value = PLAYBACK_MODES[(index + 1) % PLAYBACK_MODES.length]
  saveSettings()
}

function randomIndex() {
  if (queue.value.length < 2)
    return currentIndex.value
  let next = currentIndex.value
  while (next === currentIndex.value)
    next = Math.floor(Math.random() * queue.value.length)
  return next
}

function goNext(fromEnded = false) {
  if (!queue.value.length)
    return
  if (fromEnded && playbackMode.value === 'stop') {
    playbackIntent = false
    isPlaying.value = false
    isLoading.value = false
    return
  }
  if (fromEnded && playbackMode.value === 'one') {
    seek(0)
    void audio.value?.play().catch(handlePlayRejection)
    return
  }
  const index = playbackMode.value === 'random'
    ? randomIndex()
    : (currentIndex.value + 1) % queue.value.length
  setTrackIndex(index, true)
}

function goPrevious() {
  if (!queue.value.length)
    return
  if (currentTime.value > 3) {
    seek(0)
    return
  }
  const index = playbackMode.value === 'random'
    ? randomIndex()
    : (currentIndex.value - 1 + queue.value.length) % queue.value.length
  setTrackIndex(index, true)
}

function onEnded() {
  goNext(true)
}

export function registerPlaylistTrack(
  context: string,
  getTrack: () => PlayableTrack,
  getElement: () => HTMLElement | null,
) {
  const token = Symbol(context)
  let entries = registry.get(context)
  if (!entries) {
    entries = new Map()
    registry.set(context, entries)
  }
  entries.set(token, { token, getTrack, getElement })
  return {
    token,
    unregister: () => {
      const current = registry.get(context)
      current?.delete(token)
      if (!current?.size)
        registry.delete(context)
    },
  }
}

function compareDomOrder(a: RegisteredTrack, b: RegisteredTrack) {
  const first = a.getElement()
  const second = b.getElement()
  if (!first || !second || first === second)
    return 0
  const relation = first.compareDocumentPosition(second)
  if (relation & Node.DOCUMENT_POSITION_FOLLOWING)
    return -1
  if (relation & Node.DOCUMENT_POSITION_PRECEDING)
    return 1
  return 0
}

export function playRegisteredTrack(context: string, token: symbol) {
  const entries = [...(registry.get(context)?.values() || [])].sort(compareDomOrder)
  const selected = entries.find(entry => entry.token === token)
  if (!selected)
    return
  playSnapshot(context, entries.map(entry => entry.getTrack()), selected.getTrack().id)
}

export function useGlobalMusicPlayer() {
  return {
    queue,
    contextId,
    currentIndex,
    currentVersionIndex,
    currentCandidateIndex,
    currentTrack,
    currentVersion,
    hasTrack,
    playbackMode,
    currentTime,
    duration,
    volume,
    isMuted,
    isCollapsed,
    isPlaying,
    isLoading,
    error,
    attachAudio,
    initializeSettings,
    playSnapshot,
    playQueueTrack,
    togglePlayback,
    selectVersion,
    seek,
    setVolume,
    toggleMute,
    toggleCollapsed,
    cyclePlaybackMode,
    goNext,
    goPrevious,
    onLoadedMetadata,
    onCanPlay,
    onTimeUpdate,
    onPlay,
    onPause,
    onWaiting,
    onAudioError,
    onEnded,
  }
}
