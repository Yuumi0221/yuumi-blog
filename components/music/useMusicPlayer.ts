import type { ComputedRef } from 'vue'
import type { Song, SongAudioSource, UrlAudioSource } from './music'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { getSongCoverUrl } from './covers'
import { getBilibiliVideoId } from './music'

export type PlaybackMode = 'list' | 'one' | 'random' | 'stop'

const PLAYBACK_MODES: PlaybackMode[] = ['list', 'one', 'random', 'stop']

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
}

let persistentAPlayer: APlayerLike | null = null
let persistentSession: PersistentSession | null = null
const persistentFailedNeteaseSources = new Set<string>()

export function useMusicPlayer(
  allSongs: Song[],
  queue: ComputedRef<Song[]>,
  initialSong?: Song,
  preferInitialSong = false,
) {
  const persistentTrack = persistentAPlayer?.list?.audios[persistentAPlayer.list.index]
  const shouldRestorePlayingSong = Boolean(
    persistentSession
    && persistentAPlayer
    && !persistentAPlayer.audio.paused
    && persistentTrack?.archiveSongId === persistentSession.songId,
  )
  const restoredSong = persistentSession && (!preferInitialSong || shouldRestorePlayingSong)
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
  const unavailableRuntimeSongs = ref(new Set<string>())
  const failedNeteaseSources = ref(new Set(persistentFailedNeteaseSources))

  let urlAudio: HTMLAudioElement | null = null
  let removeMediaListeners: (() => void) | null = null
  let resumeAfterLoad = false
  let mounted = false
  let sourcePrepared = false
  let resolvedNeteaseTrack: APlayerAudio | null = null
  let lastAudibleVolume = 0.7

  function getBilibiliSource(song: Song): UrlAudioSource | null {
    if (unavailableRuntimeSongs.value.has(song.id))
      return null
    const bvid = getBilibiliVideoId(song)
    if (!bvid)
      return null
    return {
      id: `bilibili-${song.id}`,
      type: 'url',
      src: `/api/bilibili-audio?bvid=${encodeURIComponent(bvid)}`,
      label: 'Bilibili 视频音频',
      availability: 'available',
    }
  }

  function runtimeSourceKey(song: Song, sourceId: string) {
    return `${song.id}:${sourceId}`
  }

  const currentSource = computed<SongAudioSource | null>(() => {
    const configured = currentSong.value.audioSources?.[currentSourceIndex.value]
    if (
      configured?.type === 'netease'
      && failedNeteaseSources.value.has(runtimeSourceKey(currentSong.value, configured.id))
    ) {
      return getBilibiliSource(currentSong.value)
    }
    if (configured?.availability !== 'unavailable')
      return configured || getBilibiliSource(currentSong.value)
    return getBilibiliSource(currentSong.value) || configured
  })

  const hasBilibiliFallback = computed(() => Boolean(getBilibiliSource(currentSong.value)))

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

  function configureGlobalPlayer(player: APlayerLike) {
    revealGlobalPlayer(player)
    if (player.options) {
      player.options.loop = 'none'
      player.options.order = 'list'
    }
  }

  function releaseUrlAudio() {
    if (!urlAudio)
      return
    urlAudio.pause()
    urlAudio.removeAttribute('src')
    urlAudio.load()
    urlAudio = null
  }

  function createUrlTrack(source: UrlAudioSource): APlayerAudio {
    return {
      name: currentSong.value.title,
      artist: currentSong.value.artists.join(' / '),
      url: source.src,
      cover: getSongCoverUrl(currentSong.value, 'cover'),
    }
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

    releaseUrlAudio()

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
      const failedSource = currentSource.value
      const shouldResume = isPlaying.value || resumeAfterLoad
      isPlaying.value = false
      isLoading.value = false
      const message = '当前音源加载失败，请尝试外部平台链接。'
      if (
        failedSource?.type === 'netease'
        && activateBilibiliFallback(failedSource.id, shouldResume)
      ) {
        return
      }
      if (failedSource?.id.startsWith('bilibili-')) {
        const failedSongId = currentSong.value.id
        reportBilibiliUnavailable(failedSongId)
        void nextTick(() => {
          if (currentSong.value.id === failedSongId)
            error.value = message
        })
      }
      else {
        error.value = message
      }
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
    releaseUrlAudio()

    player.pause()
    configureGlobalPlayer(player)
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

    if (isPlaying.value) {
      pause()
      return
    }

    if (!sourcePrepared || (!currentMedia.value && error.value)) {
      resumeAfterLoad = true
      prepareSource()
      return
    }

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
    sourcePrepared = true

    const source = currentSource.value
    if (!source || source.availability === 'unavailable') {
      sourcePrepared = false
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
    const track = createUrlTrack(source)
    if (loadGlobalTrack(track))
      return

    urlAudio = new Audio()
    urlAudio.preload = 'none'
    urlAudio.src = source.src
    currentMedia.value = urlAudio
    bindMedia(urlAudio)
    saveSession()

    if (resumeAfterLoad)
      void playActive()
  }

  function connectGlobalPlayer(player: APlayerLike) {
    persistentAPlayer = player
    globalAPlayer.value = player
    configureGlobalPlayer(player)

    const playerList = player.list
    const activeTrack = playerList?.audios[playerList.index]
    if (
      activeTrack?.archiveSongId === currentSong.value.id
      && activeTrack.archiveSourceId === currentSource.value?.id
    ) {
      sourcePrepared = true
      needsNeteaseResolver.value = false
      bindExistingGlobalPlayer(player)
      return
    }

    if (!sourcePrepared)
      return

    const source = currentSource.value
    if (source?.type === 'url') {
      const wasPlaying = isPlaying.value
      const position = currentTime.value
      resumeAfterLoad = wasPlaying
      loadGlobalTrack(createUrlTrack(source), position)
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
    sourcePrepared = true
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

    if (activateBilibiliFallback(sourceId, resumeAfterLoad || isPlaying.value))
      return

    cleanupBackend()
    resumeAfterLoad = false
    isPlaying.value = false
    isLoading.value = false
    error.value = message || '网易云音源暂时无法解析，请使用外部平台链接。'
  }

  function activateBilibiliFallback(sourceId: string, shouldResume: boolean) {
    const source = currentSource.value
    if (source?.type !== 'netease' || source.id !== sourceId || !getBilibiliSource(currentSong.value))
      return false

    const nextFailedSources = new Set(failedNeteaseSources.value)
    const sourceKey = runtimeSourceKey(currentSong.value, sourceId)
    nextFailedSources.add(sourceKey)
    persistentFailedNeteaseSources.add(sourceKey)
    resumeAfterLoad = shouldResume
    error.value = null
    failedNeteaseSources.value = nextFailedSources
    return true
  }

  function reportBilibiliUnavailable(songId: string) {
    if (unavailableRuntimeSongs.value.has(songId))
      return
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
    const source = currentSong.value.audioSources?.[index]
    if (!source)
      return

    const sourceKey = runtimeSourceKey(currentSong.value, source.id)
    const retryFailedNetease = source.type === 'netease' && failedNeteaseSources.value.has(sourceKey)
    if (index === currentSourceIndex.value && !retryFailedNetease)
      return

    resumeAfterLoad = isPlaying.value
    if (retryFailedNetease) {
      const nextFailedSources = new Set(failedNeteaseSources.value)
      nextFailedSources.delete(sourceKey)
      persistentFailedNeteaseSources.delete(sourceKey)
      failedNeteaseSources.value = nextFailedSources
    }
    else {
      currentSourceIndex.value = index
    }
    saveSession()
  }

  function hasPlayableSource(song: Song) {
    return Boolean(
      song.audioSources?.some(source => (
        source.availability !== 'unavailable'
        && !(source.type === 'netease' && failedNeteaseSources.value.has(runtimeSourceKey(song, source.id)))
      ))
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
    playbackMode.value = PLAYBACK_MODES[(PLAYBACK_MODES.indexOf(playbackMode.value) + 1) % PLAYBACK_MODES.length]
    localStorage.setItem('yuumi-music-playback-mode', playbackMode.value)
  }

  onMounted(() => {
    mounted = true
    const savedMode = localStorage.getItem('yuumi-music-playback-mode') as PlaybackMode | null
    if (savedMode && PLAYBACK_MODES.includes(savedMode))
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

    const activePlayer = persistentAPlayer
    const activeTrack = activePlayer?.list?.audios[activePlayer.list.index]
    if (
      activePlayer
      && activeTrack?.archiveSongId === currentSong.value.id
      && activeTrack.archiveSourceId === currentSource.value?.id
    ) {
      sourcePrepared = true
      bindExistingGlobalPlayer(activePlayer)
    }
    else if (activePlayer && preferInitialSong && activeTrack?.archiveSongId) {
      activePlayer.pause()
    }
  })

  watch(
    [
      () => currentSong.value.id,
      () => currentSourceIndex.value,
      () => currentSource.value?.id,
      () => currentSource.value?.availability,
      () => currentSource.value?.type === 'url' ? currentSource.value.src : '',
    ],
    () => {
      if (!mounted)
        return

      const shouldResume = resumeAfterLoad
      sourcePrepared = false
      backendType.value = 'none'
      needsNeteaseResolver.value = false
      resolvedNeteaseTrack = null
      cleanupBackend()
      resetTimeline()
      saveSession()

      if (shouldResume) {
        resumeAfterLoad = true
        prepareSource()
      }
      else {
        resumeAfterLoad = false
      }
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
    hasPlayableSource,
  }
}
