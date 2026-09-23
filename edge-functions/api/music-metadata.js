const JSON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  'Content-Type': 'application/json; charset=utf-8',
}

class RequestError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function withHttps(url) {
  if (typeof url !== 'string' || !url)
    return undefined
  return url.startsWith('//') ? `https:${url}` : url.replace(/^http:/, 'https:')
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Referer': url.includes('bilibili.com') || url.includes('hdslb.com')
          ? 'https://www.bilibili.com/'
          : 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 YuumiMusicLibrary/2.0',
      },
      signal: controller.signal,
    })
    if (!response.ok)
      throw new Error(`Upstream returned ${response.status}`)
    return await response.json()
  }
  finally {
    clearTimeout(timer)
  }
}

function parseLrc(value) {
  if (typeof value !== 'string')
    return []

  const lines = []
  for (const row of value.split(/\r?\n/)) {
    const text = row.replace(/\[(?:\d{1,2}):\d{2}(?:[.:]\d{1,3})?\]/g, '').trim()
    if (!text)
      continue
    for (const match of row.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)) {
      const fraction = match[3] ? Number(`0.${match[3].padEnd(3, '0')}`) : 0
      lines.push({ start: Number(match[1]) * 60 + Number(match[2]) + fraction, text })
    }
  }
  return lines.sort((a, b) => a.start - b.start)
}

async function getNeteaseMetadata(songId, includeLyrics) {
  const detailPath = `/api/song/detail/?id=${songId}&ids=%5B${songId}%5D`
  const detailResults = await Promise.allSettled([
    fetchJson(`https://music.163.com${detailPath}`),
    fetchJson(`https://interface.music.163.com${detailPath}`),
  ])
  const song = detailResults
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value?.songs?.[0])
    .find(Boolean)
  let lyrics = []

  if (includeLyrics) {
    const lyricPath = `/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1&rv=-1`
    const lyricResults = await Promise.allSettled([
      fetchJson(`https://music.163.com${lyricPath}`),
      fetchJson(`https://interface.music.163.com${lyricPath}`),
    ])
    lyrics = lyricResults
      .filter(result => result.status === 'fulfilled')
      .map(result => parseLrc(result.value?.lrc?.lyric))
      .find(lines => lines.length) || []
  }

  if (includeLyrics && !lyrics.length) {
    const mediaResults = await Promise.allSettled([
      fetchJson(`https://music.163.com/api/song/media?id=${songId}`),
      fetchJson(`https://interface.music.163.com/api/song/media?id=${songId}`),
    ])
    lyrics = mediaResults
      .filter(result => result.status === 'fulfilled')
      .map(result => parseLrc(result.value?.lyric))
      .find(lines => lines.length) || []
  }

  return {
    ...(song?.name ? { title: song.name } : {}),
    ...(Array.isArray(song?.artists) && song.artists.length
      ? { artist: song.artists.map(item => item.name).filter(Boolean).join(' / ') }
      : {}),
    ...(withHttps(song?.album?.picUrl) ? { cover: withHttps(song.album.picUrl) } : {}),
    lyrics,
  }
}

async function getBilibiliMetadata(bvid, page, includeLyrics) {
  const view = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  if (view?.code !== 0 || !view?.data)
    throw new Error('Bilibili video metadata is unavailable')

  const pages = Array.isArray(view.data.pages) ? view.data.pages : []
  if (page > Math.max(1, pages.length))
    throw new RequestError('Bilibili page is out of range', 400)
  const selectedPage = pages[page - 1]
  const cid = selectedPage?.cid || (page === 1 ? view.data.cid : null)
  if (!cid)
    throw new Error('Bilibili page CID is unavailable')

  let lyrics = []
  if (includeLyrics) {
    try {
      const player = await fetchJson(`https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`)
      const subtitles = player?.data?.subtitle?.subtitles || []
      const preferred = subtitles.find(item => /zh|ai-zh|cn/i.test(item.lan || '')) || subtitles[0]
      const subtitleUrl = withHttps(preferred?.subtitle_url)
      if (subtitleUrl) {
        const subtitle = await fetchJson(subtitleUrl)
        lyrics = (subtitle?.body || [])
          .filter(item => Number.isFinite(item.from) && typeof item.content === 'string' && item.content.trim())
          .map(item => ({ start: item.from, end: item.to, text: item.content.trim() }))
      }
    }
    catch {
      // Subtitle failure does not discard the rest of the metadata.
    }
  }

  return {
    ...(selectedPage?.part || view.data.title ? { title: selectedPage?.part || view.data.title } : {}),
    ...(view.data.owner?.name ? { artist: view.data.owner.name } : {}),
    ...(withHttps(view.data.pic) ? { cover: withHttps(view.data.pic) } : {}),
    lyrics,
  }
}

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams
  const neteaseId = params.get('neteaseId')
  const bvid = params.get('bvid')
  const pageValue = params.get('page') || '1'
  const includeLyrics = params.get('lyrics') !== '0'

  if (neteaseId && !/^\d{5,16}$/.test(neteaseId))
    return json({ error: 'Invalid neteaseId' }, 400)
  if (bvid && !/^BV[A-Za-z0-9]{10}$/.test(bvid))
    return json({ error: 'Invalid bvid' }, 400)
  if (bvid && (!/^\d+$/.test(pageValue) || Number(pageValue) < 1))
    return json({ error: 'Invalid page' }, 400)
  if (!neteaseId && !bvid)
    return json({ lyrics: [] })

  const result = { lyrics: [] }
  if (neteaseId) {
    try {
      Object.assign(result, await getNeteaseMetadata(neteaseId, includeLyrics))
    }
    catch {
      // A configured Bilibili source may still supply matching metadata.
    }
  }

  if (bvid) {
    try {
      const bilibili = await getBilibiliMetadata(bvid, Number(pageValue), includeLyrics)
      if (!result.title && bilibili.title)
        result.title = bilibili.title
      if (!result.artist && bilibili.artist)
        result.artist = bilibili.artist
      if (!result.cover && bilibili.cover)
        result.cover = bilibili.cover
      if (!result.lyrics.length && bilibili.lyrics.length)
        result.lyrics = bilibili.lyrics
    }
    catch (error) {
      if (error instanceof RequestError)
        return json({ error: error.message }, error.status)
    }
  }

  return json(result)
}
