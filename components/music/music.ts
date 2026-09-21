export type SongKind = 'solo' | 'collaboration' | 'instrumental'
export type AudioAvailability = 'available' | 'unverified' | 'unavailable'
export type LinkPlatform = 'bilibili' | 'netease' | 'youtube' | 'nicovideo' | 'acfun' | 'qqmusic' | 'other'

export interface CreditValue {
  text: string
  url?: string
}

export interface SongCredit {
  role: string
  values: CreditValue[]
}

interface AudioSourceBase {
  id: string
  label: string
  availability?: AudioAvailability
  note?: string
}

export interface UrlAudioSource extends AudioSourceBase {
  type: 'url'
  src: string
}

export interface NeteaseAudioSource extends AudioSourceBase {
  type: 'netease'
  songId: string
}

export type SongAudioSource = UrlAudioSource | NeteaseAudioSource

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

export interface Song {
  id: string
  title: string
  date: string
  /** Legacy cover retained as a migration and load-error fallback. */
  cover?: string
  /** Bump this value when a generated CDN cover must be refreshed. */
  coverRevision?: number
  artists: string[]
  kind: SongKind
  credits: SongCredit[]
  audioSources?: SongAudioSource[]
  links?: SongLink[]
  videos?: SongVideo[]
  notes?: string[]
  tags?: string[]
}

export interface LyricLine {
  start: number
  end?: number
  text: string
}

export type LyricSource = 'netease' | 'bilibili' | 'none'

export interface SongDetail {
  lyrics: LyricLine[]
  lyricSource: LyricSource
}

type CreditInput = string | CreditValue

export const value = (text: string, url?: string): CreditValue => ({ text, url })

export const credit = (role: string, ...values: CreditInput[]): SongCredit => ({
  role,
  values: values.map(item => typeof item === 'string' ? { text: item } : item),
})

export const netease = (songId: string, label = '网易云音乐'): NeteaseAudioSource => ({
  id: `netease-${songId}`,
  type: 'netease',
  songId,
  label,
  availability: 'unverified',
})

export const audioUrl = (
  id: string,
  src: string,
  label = '站内音频',
  availability: AudioAvailability = 'available',
  note?: string,
): UrlAudioSource => ({ id, type: 'url', src, label, availability, note })

export const bilibili = (url: string, label = 'Bilibili'): SongLink => ({ label, url, platform: 'bilibili' })

export const neteaseLink = (songId: string, label = '网易云音乐'): SongLink => ({
  label,
  url: `https://music.163.com/#/song?id=${songId}`,
  platform: 'netease',
})

export function getSongYear(song: Song) {
  return Number(song.date.slice(0, 4))
}

export function getSongSearchText(song: Song) {
  return [
    song.title,
    ...song.artists,
    ...song.credits.flatMap(item => [item.role, ...item.values.map(entry => entry.text)]),
    ...(song.notes || []),
  ].join(' ').normalize('NFKC').toLocaleLowerCase()
}

export function getNeteaseSongId(song: Song) {
  return song.audioSources?.find(source => source.type === 'netease')?.songId || null
}

export function getBilibiliVideoId(song: Song) {
  const url = song.links?.find(link => link.platform === 'bilibili')?.url
  return url?.match(/\/(BV[A-Za-z0-9]+)/)?.[1] || null
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

    for (const source of song.audioSources || []) {
      if (source.type === 'url' && !source.src)
        errors.push(`${song.id}/${source.id} 缺少音频地址`)
      if (source.type === 'netease' && !source.songId)
        errors.push(`${song.id}/${source.id} 缺少网易云 ID`)
    }
  }

  return errors
}
