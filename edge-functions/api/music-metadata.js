const JSON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  'Content-Type': 'application/json; charset=utf-8',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function withHttps(url) {
  if (typeof url !== 'string' || !url)
    return null
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
        'User-Agent': 'Mozilla/5.0 YuumiMusicLibrary/1.0',
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
  const encodedIds = encodeURIComponent(`[${songId}]`)
  const [detail, lyric] = await Promise.allSettled([
    fetchJson(`https://music.163.com/api/song/detail/?id=${songId}&ids=${encodedIds}`),
    includeLyrics
      ? fetchJson(`https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`)
      : Promise.resolve(null),
  ])

  const song = detail.status === 'fulfilled' ? detail.value?.songs?.[0] : null
  const picUrl = withHttps(song?.album?.picUrl || song?.al?.picUrl)
  const lyricText = lyric.status === 'fulfilled' ? lyric.value?.lrc?.lyric : null
  return {
    cover: picUrl ? `${picUrl}?param=900y900` : null,
    lyrics: parseLrc(lyricText),
  }
}

async function getBilibiliMetadata(bvid, includeLyrics) {
  const view = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  if (view?.code !== 0 || !view?.data)
    return { cover: null, lyrics: [] }

  const cover = withHttps(view.data.pic)
  const cid = view.data.cid || view.data.pages?.[0]?.cid
  if (!includeLyrics || !cid)
    return { cover, lyrics: [] }

  const player = await fetchJson(`https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`)
  const subtitles = player?.data?.subtitle?.subtitles || []
  const preferred = subtitles.find(item => /zh|ai-zh|cn/i.test(item.lan || '')) || subtitles[0]
  const subtitleUrl = withHttps(preferred?.subtitle_url)
  if (!subtitleUrl)
    return { cover, lyrics: [] }

  const subtitle = await fetchJson(subtitleUrl)
  const lyrics = (subtitle?.body || [])
    .filter(item => Number.isFinite(item.from) && typeof item.content === 'string' && item.content.trim())
    .map(item => ({ start: item.from, end: item.to, text: item.content.trim() }))

  return { cover, lyrics }
}

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams
  const neteaseId = params.get('neteaseId')
  const bvid = params.get('bvid')
  const coverOnly = params.get('coverOnly') === '1'

  if (neteaseId && !/^\d{5,16}$/.test(neteaseId))
    return json({ error: 'Invalid neteaseId' }, 400)
  if (bvid && !/^BV[A-Za-z0-9]{10}$/.test(bvid))
    return json({ error: 'Invalid bvid' }, 400)
  if (!neteaseId && !bvid)
    return json({ cover: null, coverSource: 'none', lyrics: [], lyricSource: 'none', audioUrl: null, audioSource: 'none' })

  let cover = null
  let coverSource = 'none'
  let lyrics = []
  let lyricSource = 'none'
  let audioUrl = null
  let audioSource = 'none'

  if (neteaseId) {
    try {
      const netease = await getNeteaseMetadata(neteaseId, !coverOnly)
      if (netease.cover) {
        cover = netease.cover
        coverSource = 'netease'
      }
      if (netease.lyrics.length) {
        lyrics = netease.lyrics
        lyricSource = 'netease'
      }
    }
    catch {
      // Bilibili and the local CDN remain available as fallbacks.
    }
  }

  if (bvid && (!cover || (!coverOnly && !lyrics.length))) {
    try {
      const bilibili = await getBilibiliMetadata(bvid, !coverOnly && !lyrics.length)
      if (!cover && bilibili.cover) {
        cover = bilibili.cover
        coverSource = 'bilibili'
      }
      if (!lyrics.length && bilibili.lyrics.length) {
        lyrics = bilibili.lyrics
        lyricSource = 'bilibili'
      }
      if (!neteaseId && !coverOnly) {
        const proxyUrl = new URL('/api/bilibili-audio', request.url)
        proxyUrl.searchParams.set('bvid', bvid)
        audioUrl = proxyUrl.toString()
        audioSource = 'bilibili'
      }
    }
    catch {
      // The client shows its explicit fallback when both providers fail.
    }
  }

  return json({ cover, coverSource, lyrics, lyricSource, audioUrl, audioSource })
}
