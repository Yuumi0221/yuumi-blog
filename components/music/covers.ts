import type { Song } from './music'

export type SongCoverSize = 'thumb' | 'cover'

const DEFAULT_COVER_BASE_URL = 'https://cdn.yuumi.link/music/covers'
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3d7e3"/><stop offset="1" stop-color="#c9d8f2"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="400" r="190" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="28"/><circle cx="400" cy="400" r="42" fill="#fff" fill-opacity=".8"/><path d="M575 170v330a92 92 0 1 1-32-70V230l-220 48v274a92 92 0 1 1-32-70V252z" fill="#fff" fill-opacity=".7"/></svg>`

export const MUSIC_COVER_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PLACEHOLDER_SVG)}`

function coverBaseUrl() {
  const configured = typeof import.meta.env !== 'undefined'
    ? import.meta.env.VITE_MUSIC_COVER_BASE_URL
    : undefined
  return (configured || DEFAULT_COVER_BASE_URL).replace(/\/$/, '')
}

export function getSongCoverUrl(song: Song, size: SongCoverSize) {
  const revision = song.coverRevision || 1
  return `${coverBaseUrl()}/${encodeURIComponent(song.id)}/v${revision}/${size}.webp`
}

export function handleSongCoverError(event: Event, song: Song) {
  const image = event.currentTarget as HTMLImageElement
  const currentSource = image.currentSrc || image.src
  const legacyCover = song.cover
  const legacySource = legacyCover ? new URL(legacyCover, window.location.href).href : null

  if (legacyCover && legacySource && currentSource !== legacySource) {
    image.src = legacyCover
    return
  }

  if (currentSource !== MUSIC_COVER_PLACEHOLDER)
    image.src = MUSIC_COVER_PLACEHOLDER
}
