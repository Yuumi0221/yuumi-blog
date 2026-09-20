import type { ComputedRef } from 'vue'
import type { Song, SongAudioSource, UrlAudioSource } from './music'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { getBilibiliVideoId } from './music'

export type PlaybackMode = 'list' | 'one' | 'random' | 'stop'

export interface APlayerAudio {
  name?: string
  artist?: string
  url: string
  cover?: string
  lrc?: string
  type?: string
  archiveSongId?: string
  archiveSourceId?: string
}

export interface APlayerLike {
  audio: HTMLAudioElement
  play: () => void
  pause: () => void
  seek: (time: number) => void
  volume?: (percentage?: number, nostorage?: boolean) => number
  setMode?: (mode: 'mini' | 'normal') => void
  template?: {
    info?: HTMLElement
  }
  list?: {
    index: number
    audios: APlayerAudio[]
    add: (audio: APlayerAudio | APlayerAudio[]) => void
    clear: () => void
    switch: (index: number) => void
  }
  lrc?: {
    current: Array<[number, string]>
  }
  options?: {
    loop?: string
    order?: string
  }
}

type BackendType = 'none' | 'url' | 'netease'

interface PersistentSession {
  songId: string
  sourceIndex: number
  source: SongAudioSource | null
}

let persistentAPlayer: APlayerLike | null = null
let persistentSession: PersistentSession | null = null

export function useMusicPlayer(allSongs: Song[], queue: ComputedRef<Song[]>, initialSong?: Song) {
  const restoredSong = persistentSession
    ? allSongs.find(song => song.id === persistentSession?.songId)
    : null
  const currentSong = ref(restoredSong || initialSong || allSongs[0])
  const currentSourceIndex = ref(restoredSong ? persistentSession?.sourceIndex || 0 : 0)
  const backendType = ref<BackendType>('none')
  const backendKey = ref(0)
  const needsNeteaseResolver = ref(false)
  const playbackMode = ref<PlaybackMode>('list')
  const volume = ref(0.7)
  const isMuted = ref(false)

  const isPlaying = ref(false)
  const isLoading = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const error = ref<string | null>(null)

  const globalAPlayer = shallowRef<APlayerLike | null>(persistentAPlayer)
  const currentAPlayer = shallowRef<APlayerLike | null>(null)
  const currentMedia = shallowRef<HTMLAudioElement | null>(null)
  const runtimeSources = ref<Record<string, UrlAudioSource>>({})
  const runtimeCovers = ref<Record<string, string>>({})
  const unavailableRuntimeSongs = ref(new Set<string>())

  if (restoredSong && persistentSession?.source?.type === 'url' && persistentSession.source.id.startsWith('bilibili-')) {
    runtimeSources.value[restoredSong.id] = persistentSession.source
  }

  let urlAudio: HTMLAudioElement | null = null
  let removeMediaListeners: (() => void) | null = null
  let resumeAfterLoad = false
  let mounted = false
  let resolvedNeteaseTrack: APlayerAudio | null = null
  let lastAudibleVolume = 0.7

  const currentSource = computed<SongAudioSource | null>(() => {
    const configured = currentSong.value.audioSources?.[currentSourceIndex.value]
    if (configured?.availability !== 'unavailable')
      return configured || runtimeSources.value[currentSong.value.id] || null
    return runtimeSources.value[currentSong.value.id] || configured
  })

  const hasBilibiliFallback = computed(() => Boolean(
    getBilibiliVideoId(currentSong.value)
    && !unavailableRuntimeSongs.value.has(currentSong.value.id),
  ))

  const canPlay = computed(() => {
    return Boolean(
      (currentSource.value && currentSource.value.availability !== 'unavailable')
      || hasBilibiliFallback.value,
    )
  })

  function getDefaultSourceIndex(song: Song) {
    const index = song.audioSources?.findIndex(source => source.availability !== 'unavailable') ?? -1
    return index >= 0 ? index : 0
  }

  function saveSession() {
    persistentSession = {
      songId: currentSong.value.id,
      sourceIndex: currentSourceIndex.value,
      source: currentSource.value,
    }
  }

  function resetTimeline() {
    isPlaying.value = false
    isLoading.value = false
    currentTime.value = 0
    duration.value = 0
    error.value = null
  }

  function persistVolume() {
    if (typeof window === 'undefined')
      return
    localStorage.setItem('yuumi-music-volume', String(volume.value))
    localStorage.setItem('yuumi-music-muted', String(isMuted.value))
  }

  function applyVolume(media = currentMedia.value) {
    if (!media)
      return

    if (currentAPlayer.value?.audio === media && currentAPlayer.value.volume)
      currentAPlayer.value.volume(volume.value, true)
    else
      media.volume = volume.value
    media.muted = isMuted.value
  }

  function setVolume(nextVolume: number) {
    const normalized = Math.max(0, Math.min(1, Number(nextVolume)))
    if (!Number.isFinite(normalized))
      return

    volume.value = normalized
    if (normalized > 0) {
      lastAudibleVolume = normalized
      isMuted.value = false
    }
    else {
      isMuted.value = true
    }
    applyVolume()
    persistVolume()
  }

  function toggleMute() {
    if (isMuted.value) {
      if (volume.value <= 0)
        volume.value = lastAudibleVolume || 0.7
      isMuted.value = false
    }
    else {
      if (volume.value > 0)
        lastAudibleVolume = volume.value
      isMuted.value = true
    }
    applyVolume()
    persistVolume()
  }

  function revealGlobalPlayer(player: APlayerLike) {
    player.setMode?.('normal')
    if (player.template?.info)
      player.template.info.style.display = 'block'
  }

  function cleanupBackend(pauseBackend = true) {
    removeMediaListeners?.()
    removeMediaListeners = null

    if (pauseBackend) {
      try {
        currentAPlayer.value?.pause()
        if (!currentAPlayer.value)
          currentMedia.value?.pause()
      }
      catch {
        // A failed remote player may already have destroyed its media element.
      }
    }

    if (urlAudio) {
      urlAudio.pause()
      urlAudio.removeAttribute('src')
      urlAudio.load()
      urlAudio = null
    }

    currentAPlayer.value = null
    currentMedia.value = null
  }

  async function handleEnded() {
    isPlaying.value = false
    if (playbackMode.value === 'one') {
      seek(0)
      await playActive()
      return
    }
    if (playbackMode.value === 'stop')
      return
    await goNext(true, true)
  }

  function bindMedia(media: HTMLAudioElement) {
    const updateTime = () => {
      currentTime.value = Number.isFinite(media.currentTime) ? media.currentTime : 0
    }
    const updateDuration = () => {
      duration.value = Number.isFinite(media.duration) ? media.duration : 0
    }
    const onPlay = () => {
      isPlaying.value = true
      isLoading.value = false
      error.value = null
      document.documentElement.classList.add('yuumi-global-player-active')
    }
    const onPause = () => {
      isPlaying.value = false
    }
    const onWaiting = () => {
      isLoading.value = true
    }
    const onCanPlay = () => {
      isLoading.value = false
      updateDuration()
    }
    const onError = () => {
      isPlaying.value = false
      isLoading.value = false
      error.value = '当前音源加载失败，请尝试外部平台链接。'
      if (currentSource.value?.id.startsWith('bilibili-'))
        reportRuntimeSourceUnavailable(currentSong.value.id, true)
    }
    const onEnded = () => void handleEnded()
    const onVolumeChange = () => {
      volume.value = media.volume
      isMuted.value = media.muted || media.volume === 0
      if (!isMuted.value && media.volume > 0)
        lastAudibleVolume = media.volume
      persistVolume()
    }

    media.addEventListener('timeupdate', updateTime)
    media.addEventListener('durationchange', updateDuration)
    media.addEventListener('loadedmetadata', updateDuration)
    media.addEventListener('play', onPlay)
    media.addEventListener('playing', onPlay)
    media.addEventListener('pause', onPause)
    media.addEventListener('waiting', onWaiting)
    media.addEventListener('canplay', onCanPlay)
    media.addEventListener('error', onError)
    media.addEventListener('ended', onEnded)
    media.addEventListener('volumechange', onVolumeChange)

    applyVolume(media)

    removeMediaListeners = () => {
      media.removeEventListener('timeupdate', updateTime)
      media.removeEventListener('durationchange', updateDuration)
      media.removeEventListener('loadedmetadata', updateDuration)
      media.removeEventListener('play', onPlay)
      media.removeEventListener('playing', onPlay)
      media.removeEventListener('pause', onPause)
      media.removeEventListener('waiting', onWaiting)
      media.removeEventListener('canplay', onCanPlay)
      media.removeEventListener('error', onError)
      media.removeEventListener('ended', onEnded)
      media.removeEventListener('volumechange', onVolumeChange)
    }
  }

  function bindExistingGlobalPlayer(player: APlayerLike) {
    removeMediaListeners?.()
    removeMediaListeners = null
    currentAPlayer.value = player
    currentMedia.value = player.audio
    bindMedia(player.audio)
    currentTime.value = Number.isFinite(player.audio.currentTime) ? player.audio.currentTime : 0
    duration.value = Number.isFinite(player.audio.duration) ? player.audio.duration : 0
    isPlaying.value = !player.audio.paused
    isLoading.value = false
    saveSession()
  }

  function loadGlobalTrack(track: APlayerAudio, startAt = 0) {
    const player = globalAPlayer.value
    if (!player?.list)
      return false

    removeMediaListeners?.()
    removeMediaListeners = null
    if (urlAudio) {
      urlAudio.pause()
      urlAudio.removeAttribute('src')
      urlAudio.load()
      urlAudio = null
    }

    player.pause()
    revealGlobalPlayer(player)
    if (player.options) {
      player.options.loop = 'none'
      player.options.order = 'list'
    }
    player.list.clear()
    player.list.add({
      ...track,
      archiveSongId: currentSong.value.id,
      archiveSourceId: currentSource.value?.id,
    })

    currentAPlayer.value = player
    currentMedia.value = player.audio
    bindMedia(player.audio)
    isLoading.value = true
    saveSession()

    if (startAt > 0) {
      const restorePosition = () => player.seek(startAt)
      if (Number.isFinite(player.audio.duration) && player.audio.duration > 0)
        restorePosition()
      else
        player.audio.addEventListener('loadedmetadata', restorePosition, { once: true })
    }

    if (resumeAfterLoad)
      void playActive()
    return true
  }

  async function playActive() {
    if (!canPlay.value)
      return

    error.value = null
    try {
      if (currentAPlayer.value) {
        currentAPlayer.value.play()
      }
      else if (currentMedia.value) {
        await currentMedia.value.play()
      }
      else {
        resumeAfterLoad = true
        isLoading.value = true
      }
    }
    catch {
      resumeAfterLoad = false
      isLoading.value = false
      error.value = '浏览器阻止了播放，请再次点击播放按钮。'
    }
  }

  function pause() {
    resumeAfterLoad = false
    currentAPlayer.value?.pause()
    if (!currentAPlayer.value)
      currentMedia.value?.pause()
  }

  async function togglePlayback() {
    if (!canPlay.value)
      return

    if (!currentMedia.value && backendType.value === 'netease' && error.value) {
      error.value = null
      isLoading.value = true
      resumeAfterLoad = true
      needsNeteaseResolver.value = true
      backendKey.value += 1
      return
    }

    if (isPlaying.value)
      pause()
    else
      await playActive()
  }

  function seek(time: number) {
    if (!Number.isFinite(time) || !currentMedia.value)
      return

    const nextTime = Math.max(0, Math.min(time, duration.value || time))
    if (currentAPlayer.value)
      currentAPlayer.value.seek(nextTime)
    else
      currentMedia.value.currentTime = nextTime
    currentTime.value = nextTime
  }

  function prepareSource() {
    cleanupBackend()
    resetTimeline()
    backendKey.value += 1
    resolvedNeteaseTrack = null

    const source = currentSource.value
    if (!source || source.availability === 'unavailable') {
      backendType.value = 'none'
      needsNeteaseResolver.value = false
      if (source?.note)
        error.value = source.note
      else if (hasBilibiliFallback.value)
        isLoading.value = resumeAfterLoad
      else
        resumeAfterLoad = false
      saveSession()
      return
    }

    const player = globalAPlayer.value
    const playerList = player?.list
    const activeTrack = playerList?.audios[playerList.index]
    if (
      player
      && activeTrack?.archiveSongId === currentSong.value.id
      && activeTrack.archiveSourceId === source.id
    ) {
      backendType.value = source.type === 'netease' ? 'netease' : 'url'
      needsNeteaseResolver.value = false
      bindExistingGlobalPlayer(player)
      return
    }

    if (source.type === 'netease') {
      backendType.value = 'netease'
      needsNeteaseResolver.value = true
      isLoading.value = true
      saveSession()
      return
    }

    backendType.value = 'url'
    needsNeteaseResolver.value = false
    const track: APlayerAudio = {
      name: currentSong.value.title,
      artist: currentSong.value.artists.join(' / '),
      url: source.src,
      cover: runtimeCovers.value[currentSong.value.id] || currentSong.value.cover,
    }
    if (loadGlobalTrack(track))
      return

    urlAudio = new Audio()
    urlAudio.preload = 'metadata'
    urlAudio.src = source.src
    currentMedia.value = urlAudio
    bindMedia(urlAudio)
    urlAudio.load()
    saveSession()

    if (resumeAfterLoad)
      void playActive()
  }

  function connectGlobalPlayer(player: APlayerLike) {
    persistentAPlayer = player
    globalAPlayer.value = player
    revealGlobalPlayer(player)
    if (player.options) {
      player.options.loop = 'none'
      player.options.order = 'list'
    }

    const playerList = player.list
    const activeTrack = playerList?.audios[playerList.index]
    if (
      activeTrack?.archiveSongId === currentSong.value.id
      && activeTrack.archiveSourceId === currentSource.value?.id
    ) {
      needsNeteaseResolver.value = false
      bindExistingGlobalPlayer(player)
      return
    }

    const source = currentSource.value
    if (source?.type === 'url') {
      const wasPlaying = isPlaying.value
      const position = currentTime.value
      resumeAfterLoad = wasPlaying
      loadGlobalTrack({
        name: currentSong.value.title,
        artist: currentSong.value.artists.join(' / '),
        url: source.src,
        cover: runtimeCovers.value[currentSong.value.id] || currentSong.value.cover,
      }, position)
    }
    else if (source?.type === 'netease' && resolvedNeteaseTrack) {
      const wasPlaying = isPlaying.value
      const position = currentTime.value
      resumeAfterLoad = wasPlaying
      loadGlobalTrack(resolvedNeteaseTrack, position)
      needsNeteaseResolver.value = false
    }
  }

  function connectNeteasePlayer(sourceId: string, player: APlayerLike) {
    if (currentSource.value?.id !== sourceId || backendType.value !== 'netease') {
      player.pause()
      return
    }

    const playerList = player.list
    const track = playerList?.audios[playerList.index]
    resolvedNeteaseTrack = track || null
    needsNeteaseResolver.value = false

    const globalList = globalAPlayer.value?.list
    const activeGlobalTrack = globalList?.audios[globalList.index]
    if (
      currentAPlayer.value === globalAPlayer.value
      && activeGlobalTrack?.archiveSongId === currentSong.value.id
      && activeGlobalTrack.archiveSourceId === sourceId
    ) {
      player.pause()
      return
    }

    if (track && loadGlobalTrack(track)) {
      player.pause()
      return
    }

    removeMediaListeners?.()
    currentAPlayer.value = player
    currentMedia.value = player.audio
    bindMedia(player.audio)
    isLoading.value = false
    duration.value = Number.isFinite(player.audio.duration) ? player.audio.duration : 0
    saveSession()

    if (resumeAfterLoad)
      void playActive()
  }

  function reportNeteaseError(sourceId: string, message?: string) {
    if (currentSource.value?.id !== sourceId || !needsNeteaseResolver.value)
      return

    cleanupBackend()
    resumeAfterLoad = false
    isPlaying.value = false
    isLoading.value = false
    error.value = message || '网易云音源暂时无法解析，请使用外部平台链接。'
  }

  function setRuntimeSource(songId: string, src: string, cover?: string) {
    const source: UrlAudioSource = {
      id: `bilibili-${songId}`,
      type: 'url',
      src,
      label: 'Bilibili 视频音频',
      availability: 'available',
    }
    runtimeSources.value = { ...runtimeSources.value, [songId]: source }
    if (cover)
      runtimeCovers.value = { ...runtimeCovers.value, [songId]: cover }

    const nextUnavailable = new Set(unavailableRuntimeSongs.value)
    nextUnavailable.delete(songId)
    unavailableRuntimeSongs.value = nextUnavailable
  }

  function reportRuntimeSourceUnavailable(songId: string, markExisting = false) {
    const existing = runtimeSources.value[songId]
    if (existing && !markExisting)
      return
    if (existing) {
      runtimeSources.value = {
        ...runtimeSources.value,
        [songId]: { ...existing, availability: 'unavailable' },
      }
    }
    const nextUnavailable = new Set(unavailableRuntimeSongs.value)
    nextUnavailable.add(songId)
    unavailableRuntimeSongs.value = nextUnavailable
    if (currentSong.value.id === songId) {
      resumeAfterLoad = false
      isLoading.value = false
    }
  }

  function selectSong(song: Song, forcePlay = isPlaying.value) {
    if (song.id === currentSong.value.id)
      return

    resumeAfterLoad = forcePlay
    currentSong.value = song
    currentSourceIndex.value = getDefaultSourceIndex(song)
    saveSession()
  }

  function selectSource(index: number) {
    if (index === currentSourceIndex.value || !currentSong.value.audioSources?.[index])
      return

    resumeAfterLoad = isPlaying.value
    currentSourceIndex.value = index
    saveSession()
  }

  function hasPlayableSource(song: Song) {
    return Boolean(
      song.audioSources?.some(source => source.availability !== 'unavailable')
      || (runtimeSources.value[song.id] && runtimeSources.value[song.id].availability !== 'unavailable')
      || (getBilibiliVideoId(song) && !unavailableRuntimeSongs.value.has(song.id)),
    )
  }

  function getRandomCandidate(list: Song[], playableOnly: boolean) {
    const candidates = list.filter(song => (
      song.id !== currentSong.value.id
      && (!playableOnly || hasPlayableSource(song))
    ))
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  async function goNext(forcePlay = isPlaying.value, playableOnly = false) {
    const list = queue.value.length ? queue.value : allSongs
    if (!list.length)
      return

    if (playbackMode.value === 'random') {
      const candidate = getRandomCandidate(list, playableOnly)
      if (candidate)
        selectSong(candidate, forcePlay)
      return
    }

    const index = list.findIndex(song => song.id === currentSong.value.id)
    for (let offset = 1; offset <= list.length; offset += 1) {
      const candidate = list[(Math.max(index, -1) + offset) % list.length]
      if (!playableOnly || hasPlayableSource(candidate)) {
        selectSong(candidate, forcePlay)
        return
      }
    }
  }

  function goPrevious() {
    const list = queue.value.length ? queue.value : allSongs
    if (!list.length)
      return

    if (playbackMode.value === 'random') {
      const candidate = getRandomCandidate(list, false)
      if (candidate)
        selectSong(candidate, isPlaying.value)
      return
    }

    const index = list.findIndex(song => song.id === currentSong.value.id)
    const targetIndex = index <= 0 ? list.length - 1 : index - 1
    selectSong(list[targetIndex], isPlaying.value)
  }

  function cyclePlaybackMode() {
    const modes: PlaybackMode[] = ['list', 'one', 'random', 'stop']
    playbackMode.value = modes[(modes.indexOf(playbackMode.value) + 1) % modes.length]
    localStorage.setItem('yuumi-music-playback-mode', playbackMode.value)
  }

  onMounted(() => {
    mounted = true
    const savedMode = localStorage.getItem('yuumi-music-playback-mode') as PlaybackMode | null
    if (savedMode && ['list', 'one', 'random', 'stop'].includes(savedMode))
      playbackMode.value = savedMode
    const savedVolumeValue = localStorage.getItem('yuumi-music-volume')
    const savedVolume = savedVolumeValue === null ? Number.NaN : Number(savedVolumeValue)
    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
      volume.value = savedVolume
      if (savedVolume > 0)
        lastAudibleVolume = savedVolume
    }
    isMuted.value = localStorage.getItem('yuumi-music-muted') === 'true'
    if (!restoredSong)
      currentSourceIndex.value = getDefaultSourceIndex(currentSong.value)
    prepareSource()
  })

  watch(
    () => [
      currentSong.value.id,
      currentSourceIndex.value,
      currentSource.value?.id,
      currentSource.value?.availability,
      currentSource.value?.type === 'url' ? currentSource.value.src : '',
    ],
    () => {
      if (mounted)
        prepareSource()
    },
  )

  onBeforeUnmount(() => {
    mounted = false
    saveSession()
    if (currentAPlayer.value && currentAPlayer.value === globalAPlayer.value)
      cleanupBackend(false)
    else
      cleanupBackend()
  })

  return {
    currentSong,
    currentSource,
    currentSourceIndex,
    backendType,
    backendKey,
    needsNeteaseResolver,
    playbackMode,
    volume,
    isMuted,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    error,
    canPlay,
    selectSong,
    selectSource,
    togglePlayback,
    pause,
    seek,
    goNext,
    goPrevious,
    cyclePlaybackMode,
    setVolume,
    toggleMute,
    connectGlobalPlayer,
    connectNeteasePlayer,
    reportNeteaseError,
    setRuntimeSource,
    reportRuntimeSourceUnavailable,
    hasPlayableSource,
  }
}
