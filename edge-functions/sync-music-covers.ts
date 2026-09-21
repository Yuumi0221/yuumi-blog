import type { Song } from '../components/music/music'
import { createHash } from 'node:crypto'
import COS from 'cos-nodejs-sdk-v5'
import sharp from 'sharp'
import { getBilibiliVideoId, getNeteaseSongId } from '../components/music/music'
import { songs } from '../pages/posts/songs.config'

const COVER_PREFIX = 'music/covers'
const CONCURRENCY = 3
const FETCH_TIMEOUT_MS = 8000
const FETCH_ATTEMPTS = 3
const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_HTML_BYTES = 2 * 1024 * 1024
const STABLE_CACHE = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
const TEMPORARY_CACHE = 'public, max-age=300, s-maxage=300'
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const BILIBILI_MIXIN_KEY_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]
const PLACEHOLDER_SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3d7e3"/><stop offset="1" stop-color="#c9d8f2"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="400" r="190" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="28"/><circle cx="400" cy="400" r="42" fill="#fff" fill-opacity=".8"/><path d="M575 170v330a92 92 0 1 1-32-70V230l-220 48v274a92 92 0 1 1-32-70V252z" fill="#fff" fill-opacity=".7"/></svg>`)
const LEGACY_COVER_BASE_URL = 'https://cdn.yuumi.link/images/songs'
const LEGACY_COVER_FILES: Record<string, string> = {
  '2023-07-25-hua-si-ji': '化四季.jpg',
  '2020-11-20-saikai': '再会.png',
  '2020-10-15-gekijo-no-ghost': '鬼.png',
  '2020-08-13-tokyo-summer-session': '虐狗大会6人曲绘.jpg',
  '2019-08-15-additional-memory': 'アディショナルメモリー.jpg',
}

type CoverOrigin = 'netease' | 'bilibili' | 'legacy' | 'fallback' | 'placeholder'

interface ResolvedCover {
  buffer: Buffer
  origin: CoverOrigin
  temporary: boolean
}

interface ObjectState {
  exists: boolean
  origin: string | null
}

interface BilibiliSession {
  cookie: string
  mixinKey: string
}

let bucket: string
let region: string
let cos: COS
let bilibiliSessionPromise: Promise<BilibiliSession> | null = null

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value)
    throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function objectKeys(song: Song) {
  const base = `${COVER_PREFIX}/${song.id}`
  return {
    thumbnail: `${base}/thumb.webp`,
    cover: `${base}/cover.webp`,
  }
}

function isMissingObject(error: unknown) {
  if (!error || typeof error !== 'object')
    return false
  const candidate = error as { statusCode?: number, code?: string }
  return candidate.statusCode === 404 || candidate.code === 'NoSuchKey' || candidate.code === 'NotFound'
}

async function inspectObject(key: string): Promise<ObjectState> {
  try {
    const result = await cos.headObject({ Bucket: bucket, Region: region, Key: key })
    const headers = Object.fromEntries(
      Object.entries(result.headers || {}).map(([name, value]) => [name.toLowerCase(), value]),
    )
    const origin = headers['x-cos-meta-cover-origin'] || headers['x-amz-meta-cover-origin']
    return {
      exists: true,
      origin: typeof origin === 'string' ? origin : null,
    }
  }
  catch (error) {
    if (isMissingObject(error))
      return { exists: false, origin: null }
    throw error
  }
}

function shouldSkip(song: Song, states: ObjectState[]) {
  const hasPlatformSource = Boolean(getNeteaseSongId(song) || getBilibiliVideoId(song))
  const validOrigins = hasPlatformSource
    ? new Set(['netease', 'bilibili'])
    : new Set([LEGACY_COVER_FILES[song.id] ? 'legacy' : 'placeholder'])
  return states.every(state => state.exists && state.origin && validOrigins.has(state.origin))
}

function requestHeaders(url: string, extraHeaders: Record<string, string> = {}) {
  const isBilibili = url.includes('bilibili.com') || url.includes('hdslb.com')
  return {
    'Accept': '*/*',
    'Referer': isBilibili ? 'https://www.bilibili.com/' : 'https://music.163.com/',
    'User-Agent': BROWSER_USER_AGENT,
    ...extraHeaders,
  }
}

async function fetchWithRetry<T>(
  url: string,
  read: (response: Response) => Promise<T>,
  extraHeaders: Record<string, string> = {},
) {
  let lastError: unknown
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        headers: requestHeaders(url, extraHeaders),
        signal: controller.signal,
      })
      if (!response.ok)
        throw new Error(`Upstream returned ${response.status}`)
      return await read(response)
    }
    catch (error) {
      lastError = error
      if (attempt < FETCH_ATTEMPTS)
        await new Promise(resolve => setTimeout(resolve, attempt * 250))
    }
    finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}

async function fetchJson(url: string, extraHeaders: Record<string, string> = {}) {
  return await fetchWithRetry(url, response => response.json(), {
    Accept: 'application/json',
    ...extraHeaders,
  }) as any
}

async function fetchImage(url: string, extraHeaders: Record<string, string> = {}) {
  const buffer = await fetchWithRetry(
    url.startsWith('//') ? `https:${url}` : url.replace(/^http:/, 'https:'),
    async (response) => {
      const declaredLength = Number(response.headers.get('content-length'))
      if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_BYTES)
        throw new Error(`Image is larger than ${MAX_SOURCE_BYTES} bytes`)
      return Buffer.from(await response.arrayBuffer())
    },
    extraHeaders,
  )
  if (!buffer.length || buffer.length > MAX_SOURCE_BYTES)
    throw new Error('Image response is empty or too large')

  await sharp(buffer).metadata()
  return buffer
}

async function getNeteaseCover(songId: string) {
  const encodedIds = encodeURIComponent(`[${songId}]`)
  const result = await fetchJson(`https://music.163.com/api/song/detail/?id=${songId}&ids=${encodedIds}`)
  const song = result?.songs?.[0]
  const cover = song?.album?.picUrl || song?.al?.picUrl
  if (typeof cover !== 'string' || !cover)
    throw new Error('NetEase did not return a cover')
  return await fetchImage(`${cover}?param=1200y1200`)
}

function bilibiliApiError(label: string, result: any) {
  const code = result?.code ?? 'unknown'
  const message = result?.message || result?.msg || 'unknown error'
  return new Error(`${label} returned code ${code}: ${message}`)
}

function keyFromBilibiliUrl(url: unknown, label: string) {
  if (typeof url !== 'string' || !url)
    throw new Error(`Bilibili nav did not return ${label}`)
  const fileName = new URL(url).pathname.split('/').pop() || ''
  const key = fileName.split('.')[0]
  if (!key)
    throw new Error(`Bilibili nav returned an invalid ${label}`)
  return key
}

async function createBilibiliSession(): Promise<BilibiliSession> {
  const fingerprint = await fetchJson('https://api.bilibili.com/x/frontend/finger/spi')
  if (fingerprint?.code !== 0)
    throw bilibiliApiError('Bilibili fingerprint API', fingerprint)

  const buvid3 = fingerprint?.data?.b_3
  const buvid4 = fingerprint?.data?.b_4
  if (typeof buvid3 !== 'string' || typeof buvid4 !== 'string')
    throw new Error('Bilibili fingerprint API did not return anonymous device cookies')

  const cookie = [
    `buvid3=${buvid3}`,
    `buvid4=${buvid4}`,
    'CURRENT_FNVAL=4048',
    'CURRENT_QUALITY=0',
  ].join('; ')
  const nav = await fetchJson('https://api.bilibili.com/x/web-interface/nav', { Cookie: cookie })
  if (nav?.code !== 0)
    throw bilibiliApiError('Bilibili nav API', nav)

  const imgKey = keyFromBilibiliUrl(nav?.data?.wbi_img?.img_url, 'WBI image key')
  const subKey = keyFromBilibiliUrl(nav?.data?.wbi_img?.sub_url, 'WBI sub key')
  const sourceKey = imgKey + subKey
  const mixinKey = BILIBILI_MIXIN_KEY_TABLE
    .map(index => sourceKey[index])
    .join('')
    .slice(0, 32)

  if (mixinKey.length !== 32)
    throw new Error('Bilibili WBI mixin key is invalid')
  return { cookie, mixinKey }
}

async function getBilibiliSession() {
  if (!bilibiliSessionPromise) {
    bilibiliSessionPromise = createBilibiliSession().catch((error) => {
      bilibiliSessionPromise = null
      throw error
    })
  }
  return await bilibiliSessionPromise
}

function signBilibiliQuery(bvid: string, mixinKey: string) {
  const params = new URLSearchParams()
  const values = {
    bvid,
    wts: Math.floor(Date.now() / 1000).toString(),
  }
  for (const [key, value] of Object.entries(values).sort(([left], [right]) => left.localeCompare(right)))
    params.set(key, value.replace(/[!'()*]/g, ''))

  const query = params.toString()
  const signature = createHash('md5').update(query + mixinKey).digest('hex')
  return `${query}&w_rid=${signature}`
}

function coverFromBilibiliResult(label: string, result: any) {
  if (result?.code !== 0)
    throw bilibiliApiError(label, result)
  const cover = result?.data?.pic
  if (typeof cover !== 'string' || !cover)
    throw new Error(`${label} did not return a cover URL`)
  return cover
}

async function getBilibiliWbiCoverUrl(bvid: string) {
  const session = await getBilibiliSession()
  const query = signBilibiliQuery(bvid, session.mixinKey)
  const result = await fetchJson(`https://api.bilibili.com/x/web-interface/wbi/view?${query}`, {
    Cookie: session.cookie,
  })
  return coverFromBilibiliResult('Bilibili WBI API', result)
}

async function getBilibiliPlainCoverUrl(bvid: string) {
  const result = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  return coverFromBilibiliResult('Bilibili view API', result)
}

async function getBilibiliPageCoverUrl(bvid: string) {
  const html = await fetchWithRetry(
    `https://www.bilibili.com/video/${bvid}`,
    async (response) => {
      const declaredLength = Number(response.headers.get('content-length'))
      if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES)
        throw new Error(`Bilibili page is larger than ${MAX_HTML_BYTES} bytes`)
      const text = await response.text()
      if (text.length > MAX_HTML_BYTES)
        throw new Error(`Bilibili page is larger than ${MAX_HTML_BYTES} bytes`)
      return text
    },
    { Accept: 'text/html,application/xhtml+xml' },
  )
  const tags = html.match(/<meta\b[^>]*>/gi) || []
  const tag = tags.find(item => /(?:property|itemprop)=["'](?:og:image|image)["']/i.test(item))
  const cover = tag?.match(/content=["']([^"']+)["']/i)?.[1]
  if (!cover)
    throw new Error('Bilibili video page did not return an og:image cover')
  return cover.replace(/&amp;/g, '&').replace(/&#x2f;/gi, '/')
}

async function getBilibiliCover(bvid: string) {
  const lookupErrors: string[] = []
  let cover: string | null = null
  const lookups = [getBilibiliWbiCoverUrl, getBilibiliPlainCoverUrl, getBilibiliPageCoverUrl]

  for (const lookup of lookups) {
    try {
      cover = await lookup(bvid)
      break
    }
    catch (error) {
      lookupErrors.push(String(error))
    }
  }

  if (!cover)
    throw new Error(lookupErrors.join('; '))

  const normalizedCover = cover.startsWith('//') ? `https:${cover}` : cover.replace(/^http:/, 'https:')
  try {
    return await fetchImage(`${normalizedCover}@.webp`, {
      Accept: 'image/avif,image/webp,image/*,*/*',
    })
  }
  catch (webpError) {
    console.warn(`[music-covers] ${bvid}: Bilibili WebP transform failed (${String(webpError)}), retrying the original image`)
    return await fetchImage(normalizedCover)
  }
}

async function resolveCover(song: Song): Promise<ResolvedCover> {
  const neteaseId = getNeteaseSongId(song)
  const bvid = getBilibiliVideoId(song)
  const hasPlatformSource = Boolean(neteaseId || bvid)

  if (neteaseId) {
    try {
      return { buffer: await getNeteaseCover(neteaseId), origin: 'netease', temporary: false }
    }
    catch (error) {
      console.warn(`[music-covers] ${song.id}: NetEase cover failed (${String(error)})`)
    }
  }

  if (bvid) {
    try {
      return { buffer: await getBilibiliCover(bvid), origin: 'bilibili', temporary: false }
    }
    catch (error) {
      console.warn(`[music-covers] ${song.id}: Bilibili cover failed (${String(error)})`)
    }
  }

  const legacyCoverFile = LEGACY_COVER_FILES[song.id]
  if (legacyCoverFile) {
    try {
      return {
        buffer: await fetchImage(`${LEGACY_COVER_BASE_URL}/${legacyCoverFile}`),
        origin: hasPlatformSource ? 'fallback' : 'legacy',
        temporary: hasPlatformSource,
      }
    }
    catch (error) {
      console.warn(`[music-covers] ${song.id}: legacy cover failed (${String(error)})`)
    }
  }

  return {
    buffer: PLACEHOLDER_SVG,
    origin: hasPlatformSource ? 'fallback' : 'placeholder',
    temporary: hasPlatformSource,
  }
}

async function renderCover(source: Buffer, size: number, quality: number) {
  return await sharp(source)
    .rotate()
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .webp({ quality })
    .toBuffer()
}

async function uploadCover(key: string, body: Buffer, resolved: ResolvedCover) {
  await cos.putObject({
    Bucket: bucket,
    Region: region,
    Key: key,
    Body: body,
    ContentLength: body.length,
    ContentType: 'image/webp',
    CacheControl: resolved.temporary ? TEMPORARY_CACHE : STABLE_CACHE,
    'x-cos-meta-cover-origin': resolved.origin,
  })
}

async function syncSong(song: Song) {
  const keys = objectKeys(song)
  const states = await Promise.all([inspectObject(keys.thumbnail), inspectObject(keys.cover)])
  if (shouldSkip(song, states)) {
    console.log(`[music-covers] ${song.id}: cached`)
    return 'skipped' as const
  }

  const resolved = await resolveCover(song)
  const [thumbnail, cover] = await Promise.all([
    renderCover(resolved.buffer, 160, 78),
    renderCover(resolved.buffer, 800, 84),
  ])
  await Promise.all([
    uploadCover(keys.thumbnail, thumbnail, resolved),
    uploadCover(keys.cover, cover, resolved),
  ])
  console.log(`[music-covers] ${song.id}: uploaded (${resolved.origin})`)
  return 'uploaded' as const
}

async function runPool(items: Song[]) {
  let cursor = 0
  let uploaded = 0
  let skipped = 0
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const song = items[cursor]
      cursor += 1
      const result = await syncSong(song)
      if (result === 'uploaded')
        uploaded += 1
      else
        skipped += 1
    }
  })
  await Promise.all(workers)
  return { uploaded, skipped }
}

async function main() {
  try {
    const secretId = requiredEnv('MUSIC_COS_SECRET_ID')
    const secretKey = requiredEnv('MUSIC_COS_SECRET_KEY')
    bucket = requiredEnv('TENCENT_COS_BUCKET')
    region = requiredEnv('TENCENT_COS_REGION')
    cos = new COS({ SecretId: secretId, SecretKey: secretKey })

    const result = await runPool(songs)
    console.log(`[music-covers] complete: ${result.uploaded} uploaded, ${result.skipped} cached`)
  }
  catch (error) {
    console.error(`[music-covers] failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

void main()
