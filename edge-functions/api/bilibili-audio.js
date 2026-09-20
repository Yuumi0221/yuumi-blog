const BILIBILI_HEADERS = {
  'Origin': 'https://www.bilibili.com',
  'Referer': 'https://www.bilibili.com/',
  'User-Agent': 'Mozilla/5.0 YuumiMusicLibrary/1.0',
}

function error(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { ...BILIBILI_HEADERS, 'Accept': 'application/json' },
  })
  if (!response.ok)
    throw new Error(`Bilibili returned ${response.status}`)
  return await response.json()
}

async function getAudioUrls(bvid) {
  const view = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  const cid = view?.data?.cid || view?.data?.pages?.[0]?.cid
  if (view?.code !== 0 || !cid)
    return []

  const play = await fetchJson(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=64&fnval=16&fnver=0&fourk=0`)
  const audio = (play?.data?.dash?.audio || [])
    .sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))[0]
  if (!audio)
    return []

  return [
    audio.baseUrl || audio.base_url,
    ...(audio.backupUrl || audio.backup_url || []),
  ].filter(Boolean)
}

export async function onRequestGet({ request }) {
  const bvid = new URL(request.url).searchParams.get('bvid')
  if (!bvid || !/^BV[A-Za-z0-9]{10}$/.test(bvid))
    return error('Invalid bvid', 400)

  try {
    const urls = await getAudioUrls(bvid)
    const range = request.headers.get('Range')

    for (const url of urls) {
      const response = await fetch(url, {
        headers: {
          ...BILIBILI_HEADERS,
          'Accept': '*/*',
          ...(range ? { Range: range } : {}),
        },
        signal: request.signal,
      })
      if (!response.ok)
        continue

      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': response.headers.get('Accept-Ranges') || 'bytes',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
        'Content-Type': 'audio/mp4',
      })
      for (const name of ['Content-Length', 'Content-Range', 'ETag', 'Last-Modified']) {
        const value = response.headers.get(name)
        if (value)
          headers.set(name, value)
      }

      return new Response(response.body, { status: response.status, headers })
    }

    return error('Bilibili audio is unavailable', 502)
  }
  catch {
    return error('Bilibili audio is temporarily unavailable', 503)
  }
}
