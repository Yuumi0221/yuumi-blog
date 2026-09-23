export type SongKind = 'solo' | 'collaboration' | 'band' | 'instrumental'
export type LinkPlatform = 'bilibili' | 'netease' | 'youtube' | 'nicovideo' | 'acfun' | 'qqmusic' | 'other'

export interface CreditValue {
  text: string
  url?: string
}

export interface SongCredit {
  role: string
  values: CreditValue[]
}

export type MetadataSource =
  | { type: 'netease', songId: string }
  | { type: 'bilibili', bvid: string, page?: number }

export type PlaybackCandidate =
  | { type: 'url', url: string }
  | { type: 'netease', songId: string }
  | { type: 'bilibili', bvid: string, page?: number }

export interface SongVersion {
  id: string
  label?: string
  metadataSources: MetadataSource[]
  /** Optional metadata source used only for synchronized lyrics. */
  lyricSource?: MetadataSource
  playbackCandidates: PlaybackCandidate[]
}

export interface SongLink {
  label: string
  url: string
  platform: LinkPlatform
}

export interface SongVideo {
  title: string
  src: string
  poster?: string
}

export interface PlayableTrack {
  id: string
  title: string
  artists: string[]
  cover?: string
  versions: SongVersion[]
  /** Article tracks prefer API metadata; library tracks retain their archive copy and CDN cover. */
  preferRemoteMetadata?: boolean
}

export interface Song extends PlayableTrack {
  date: string
  kind: SongKind
  credits: SongCredit[]
  links?: SongLink[]
  videos?: SongVideo[]
  notes?: string[]
  tags?: string[]
}

export type LibrarySongInput = Omit<Song, 'versions'> & {
  versions?: SongVersion[]
  /** Default lyric source copied to versions that do not define one. */
  lyricSource?: MetadataSource
}

export interface LyricLine {
  start: number
  end?: number
  text: string
}

export interface TrackMetadata {
  title?: string
  artist?: string
  cover?: string
  lyrics: LyricLine[]
}

const PLATFORM_ICONS: Record<LinkPlatform, string> = {
  bilibili: 'i-ri-bilibili-line',
  netease: 'i-ri-netease-cloud-music-line',
  youtube: 'i-ri-youtube-line',
  qqmusic: 'i-ri-qq-line',
  acfun: 'i-ri-music-2-line',
  nicovideo: 'i-ri-external-link-line',
  other: 'i-ri-external-link-line',
}

type CreditInput = string | CreditValue

export const value = (text: string, url?: string): CreditValue => ({ text, url })

export const credit = (role: string, ...values: CreditInput[]): SongCredit => ({
  role,
  values: values.map(item => typeof item === 'string' ? { text: item } : item),
})

export function version(
  id: string,
  label: string | undefined,
  metadataSources: MetadataSource[],
  playbackCandidates: PlaybackCandidate[],
): SongVersion {
  return { id, label, metadataSources, playbackCandidates }
}

/** A semantic version backed by NetEase metadata and playback. */
export const netease = (songId: string, label?: string): SongVersion => version(
  `netease-${songId}`,
  label,
  [{ type: 'netease', songId }],
  [{ type: 'netease', songId }],
)

/** A semantic version backed by a stable, self-hosted URL. */
export const audioUrl = (id: string, url: string, label?: string): SongVersion => version(
  id,
  label,
  [],
  [{ type: 'url', url }],
)

const bilibiliVersion = (bvid: string, page = 1, label?: string): SongVersion => version(
  `bilibili-${bvid}-p${page}`,
  label,
  [{ type: 'bilibili', bvid, page }],
  [{ type: 'bilibili', bvid, page }],
)

export const bilibili = (url: string, label = 'Bilibili'): SongLink => ({ label, url, platform: 'bilibili' })

export const neteaseLink = (songId: string, label = '网易云音乐'): SongLink => ({
  label,
  url: `https://music.163.com/#/song?id=${songId}`,
  platform: 'netease',
})

export function getSongYear(song: Song) {
  return Number(song.date.slice(0, 4))
}

export function getPlatformIcon(platform: LinkPlatform) {
  return PLATFORM_ICONS[platform]
}

export function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0)
    return '0:00'
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

export function getPlaybackProgress(currentTime: number, duration: number) {
  return duration > 0
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0
}

export function getSongSearchText(song: Song) {
  return [
    song.title,
    ...song.artists,
    ...song.credits.flatMap(item => [item.role, ...item.values.map(entry => entry.text)]),
    ...(song.notes || []),
  ].join(' ').normalize('NFKC').toLocaleLowerCase()
}

function getBilibiliLink(song: Pick<Song, 'links'>) {
  const url = song.links?.find(link => link.platform === 'bilibili')?.url
  const bvid = url?.match(/\/(BV[A-Za-z0-9]{10})/)?.[1]
  if (!bvid)
    return null

  let page = 1
  try {
    page = Math.max(1, Number(new URL(url).searchParams.get('p')) || 1)
  }
  catch {
    // The matched BVID remains useful if an old link is not URL-parseable.
  }
  return { bvid, page }
}

/**
 * Completes the mechanical archive migration:
 * - a Bilibili-only entry receives one playable version;
 * - a single NetEase version and its Bilibili post become candidates of that same version;
 * - multi-version entries are never guessed and must declare their mappings explicitly.
 */
export function finalizeLibrarySongs(input: LibrarySongInput[]): Song[] {
  return input.map((song) => {
    const songLyricSource = song.lyricSource
    const versions: SongVersion[] = (song.versions || []).map(item => ({
      ...item,
      metadataSources: [...item.metadataSources],
      lyricSource: item.lyricSource
        ? { ...item.lyricSource }
        : songLyricSource ? { ...songLyricSource } : undefined,
      playbackCandidates: [...item.playbackCandidates],
    }))
    const bilibiliSource = getBilibiliLink(song)

    if (!versions.length && bilibiliSource) {
      const generated = bilibiliVersion(bilibiliSource.bvid, bilibiliSource.page)
      if (songLyricSource)
        generated.lyricSource = { ...songLyricSource }
      versions.push(generated)
    }
    else if (versions.length === 1 && bilibiliSource) {
      const onlyVersion = versions[0]
      const isNeteaseVersion = onlyVersion.playbackCandidates.some(candidate => candidate.type === 'netease')
      if (isNeteaseVersion) {
        if (!onlyVersion.metadataSources.some(source => source.type === 'bilibili'))
          onlyVersion.metadataSources.push({ type: 'bilibili', ...bilibiliSource })
        if (!onlyVersion.playbackCandidates.some(candidate => candidate.type === 'bilibili'))
          onlyVersion.playbackCandidates.push({ type: 'bilibili', ...bilibiliSource })
      }
    }

    const { lyricSource: _lyricSource, ...songData } = song
    return { ...songData, versions }
  })
}

export function isPlayableTrack(track: Pick<PlayableTrack, 'versions'>) {
  return track.versions.some(item => item.playbackCandidates.length > 0)
}

export function getNeteaseSongId(track: Pick<PlayableTrack, 'versions'>) {
  for (const item of track.versions) {
    const source = item.metadataSources.find(candidate => candidate.type === 'netease')
      || item.playbackCandidates.find(candidate => candidate.type === 'netease')
    if (source?.type === 'netease')
      return source.songId
  }
  return null
}

function getBilibiliSource(track: Pick<PlayableTrack, 'versions'>) {
  for (const item of track.versions) {
    const source = item.metadataSources.find(candidate => candidate.type === 'bilibili')
      || item.playbackCandidates.find(candidate => candidate.type === 'bilibili')
    if (source?.type === 'bilibili')
      return source
  }
  return null
}

export function getBilibiliVideoId(track: Pick<PlayableTrack, 'versions'>) {
  return getBilibiliSource(track)?.bvid || null
}

export function validateSongs(list: Song[]) {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const song of list) {
    if (ids.has(song.id))
      errors.push(`重复的歌曲 ID：${song.id}`)
    ids.add(song.id)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(song.date))
      errors.push(`${song.id} 的日期不是 YYYY-MM-DD`)
    if (!song.versions.length)
      errors.push(`${song.id} 没有可播放版本`)

    const versionIds = new Set<string>()
    for (const item of song.versions) {
      if (versionIds.has(item.id))
        errors.push(`${song.id} 的版本 ID 重复：${item.id}`)
      versionIds.add(item.id)
      if (song.versions.length > 1 && !item.label)
        errors.push(`${song.id}/${item.id} 的多版本标签为空`)
      if (!item.playbackCandidates.length)
        errors.push(`${song.id}/${item.id} 没有播放候选`)
      const firstUrl = item.playbackCandidates.findIndex(candidate => candidate.type === 'url')
      if (firstUrl > 0)
        errors.push(`${song.id}/${item.id} 的自托管候选没有排在首位`)
    }
  }

  return errors
}
