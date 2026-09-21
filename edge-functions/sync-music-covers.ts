import type { Song } from '../components/music/music'
import { createHash } from 'node:crypto'
import { setDefaultResultOrder } from 'node:dns'
import COS from 'cos-nodejs-sdk-v5'
import sharp from 'sharp'
import { getBilibiliVideoId, getNeteaseSongId } from '../components/music/music'
import { songs } from '../pages/posts/songs.config'

const COVER_PREFIX = 'music/covers'
const CONCURRENCY = 3
const FETCH_ATTEMPTS = 2
const JSON_FETCH_TIMEOUT_MS = 15000
const IMAGE_FETCH_TIMEOUT_MS = 45000
const HTML_FETCH_TIMEOUT_MS = 20000
const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_HTML_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_PIXELS = 25_000_000
const STABLE_CACHE = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
const TEMPORARY_CACHE = 'public, max-age=300, s-maxage=300'
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const BILIBILI_MIXIN_KEY_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

setDefaultResultOrder('ipv4first')
const PLACEHOLDER_SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3d7e3"/><stop offset="1" stop-color="#c9d8f2"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="400" r="190" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="28"/><circle cx="400" cy="400" r="42" fill="#fff" fill-opacity=".8"/><path d="M575 170v330a92 92 0 1 1-32-70V230l-220 48v274a92 92 0 1 1-32-70V252z" fill="#fff" fill-opacity=".7"/></svg>`)
const LEGACY_COVER_URLS: Record<string, string> = {
  '2026-01-11-chronostasis': 'https://cdn.yuumi.link/images/songs/时停错觉.jpg',
  '2025-12-25-snow-song-show': 'https://cdn.yuumi.link/images/songs/SSS.png',
  '2025-09-20-hakoniwa-no-coral': 'https://cdn.yuumi.link/images/songs/箱庭.png',
  '2025-09-14-rong-meng': 'https://cdn.yuumi.link/images/songs/溶梦.png',
  '2025-08-15-hoshizukiyo-no-shirabe': 'https://cdn.yuumi.link/images/songs/星月夜.png',
  '2025-05-21-shinkonsui': 'https://cdn.yuumi.link/images/songs/深昏睡.png',
  '2024-10-02-uchiage-hanabi': 'https://cdn.yuumi.link/images/songs/打上花火.jpg',
  '2024-08-25-kyorikan': 'https://cdn.yuumi.link/images/songs/距离感.png',
  '2024-03-31-haru-koi-hana-igai-no': 'https://cdn.yuumi.link/images/songs/春恋花.png',
  '2023-07-25-hua-si-ji': 'https://cdn.yuumi.link/images/songs/化四季.jpg',
  '2023-06-18-sing-2015': 'https://cdn.yuumi.link/images/songs/sing.jpg',
  '2023-03-06-soragoto': 'https://cdn.yuumi.link/images/songs/虚言.jpg',
  '2023-02-28-mokugeki': 'https://cdn.yuumi.link/images/songs/默剧.png',
  '2022-12-25-seinaru-hi-no-inori': 'https://cdn.yuumi.link/images/songs/圣祈.jpg',
  '2022-11-11-seishun-complex': 'https://cdn.yuumi.link/images/songs/seisyun.jpg',
  '2022-11-11-karakara': 'https://cdn.yuumi.link/images/songs/karakara.jpg',
  '2022-11-08-guitar-to-kodoku': 'https://cdn.yuumi.link/images/songs/kodoku.jpg',
  '2022-11-05-parade': 'https://cdn.yuumi.link/images/songs/parade.jpg',
  '2022-10-12-ssfwl': 'https://cdn.yuumi.link/images/GEZONE/SSFWL.jpg',
  '2022-10-07-nagareyuku-kumo': 'https://cdn.yuumi.link/images/songs/yun.jpg',
  '2022-08-19-cheng-feng': 'https://cdn.yuumi.link/images/songs/乘风.jpg',
  '2022-08-12-hikaru-nara': 'https://cdn.yuumi.link/images/songs/光.jpg',
  '2022-06-25-tsubame': 'https://cdn.yuumi.link/images/GEZONE/ツバメ.png',
  '2022-06-04-romance-no-yakusoku': 'https://cdn.yuumi.link/images/songs/romance.png',
  '2022-06-03-sparkle': 'https://cdn.yuumi.link/images/songs/sparkle.jpg',
  '2022-06-02-lens': 'https://cdn.yuumi.link/images/songs/lens.jpg',
  '2022-05-31-banana-ga-taberenai-saru': 'https://cdn.yuumi.link/images/songs/香蕉.jpg',
  '2022-01-29-ayayaya': 'https://cdn.yuumi.link/images/GEZONE/AYAYAYA.png',
  '2021-10-31-dancing-stars-on-me': 'https://cdn.yuumi.link/images/songs/dsom.jpg',
  '2021-10-11-queendom-izone-flip': 'https://cdn.yuumi.link/images/GEZONE/Queendom.png',
  '2021-08-31-hey-bae-like-it': 'https://cdn.yuumi.link/images/GEZONE/Hey._Bae._Like_It.png',
  '2021-08-26-blessing-messiah': 'https://cdn.yuumi.link/images/songs/爱之塔.jpg',
  '2021-08-07-sequence': 'https://cdn.yuumi.link/images/GEZONE/Sequence.png',
  '2021-07-21-secret-story-of-the-swan': 'https://cdn.yuumi.link/images/GEZONE/Secret_Story_of_the_Swan.png',
  '2021-07-01-panorama': 'https://cdn.yuumi.link/images/GEZONE/Panorama.png',
  '2021-06-05-blessing': 'https://cdn.yuumi.link/images/songs/BLESSING.jpg',
  '2021-05-16-merry-go-round-japanese': 'https://cdn.yuumi.link/images/GEZONE/Merry-Go-Round.png',
  '2021-05-07-sing-and-smile': 'https://cdn.yuumi.link/images/songs/Sing&Smile!!.jpg',
  '2021-03-18-lesson': 'https://cdn.yuumi.link/images/songs/lesson.jpg',
  '2021-03-10-haru-dorobou': 'https://cdn.yuumi.link/images/songs/春.jpg',
  '2021-03-01-world-execute-me': 'https://cdn.yuumi.link/images/songs/wem.jpg',
  '2021-02-21-kaibutsu': 'https://cdn.yuumi.link/images/songs/怪物.jpg',
  '2020-12-06-hitchcock': 'https://cdn.yuumi.link/images/songs/hc.jpg',
  '2020-11-29-literature': 'https://cdn.yuumi.link/images/songs/魔女.jpg',
  '2020-11-20-saikai': 'https://cdn.yuumi.link/images/songs/再会.png',
  '2020-10-15-gekijo-no-ghost': 'https://cdn.yuumi.link/images/songs/鬼.png',
  '2020-08-13-tokyo-summer-session': 'https://cdn.yuumi.link/images/songs/虐狗大会6人曲绘.jpg',
  '2020-07-03-natsu-no-maboroshi': 'https://cdn.yuumi.link/images/songs/夏.jpg',
  '2020-05-08-fukashigi-no-carte': 'https://cdn.yuumi.link/images/songs/karute.jpg',
  '2020-04-19-fiesta': 'https://cdn.yuumi.link/images/GEZONE/FIESTA.png',
  '2020-02-21-tiny-light': 'https://cdn.yuumi.link/images/songs/tl.jpg',
  '2020-01-17-watashi-no-tenshi': 'https://cdn.yuumi.link/images/songs/天使.png',
  '2019-10-20-holy-flag': 'https://cdn.yuumi.link/images/songs/HF.jpg',
  '2019-08-31-hachigatsu-no-if': 'https://cdn.yuumi.link/images/songs/if.png',
  '2019-08-15-additional-memory': 'https://cdn.yuumi.link/images/songs/アディショナルメモリー.jpg',
  '2019-08-03-violeta': 'https://cdn.yuumi.link/images/GEZONE/Violeta.png',
  '2019-04-13-sakura-ryuseigun': 'https://cdn.yuumi.link/images/songs/桜流星群.jpg',
  '2019-04-05-sentimental-crisis': 'https://cdn.yuumi.link/images/songs/センチメンタルクライシス.jpg',
  '2019-02-21-ajisai-no-yoru': 'https://cdn.yuumi.link/images/songs/紫阳花.png',
  '2018-12-25-merry-chri': 'https://cdn.yuumi.link/images/songs/mc.jpg',
  '2018-12-23-la-vie-en-rose': 'https://cdn.yuumi.link/images/GEZONE/La_Vie_en_Rose.png',
  '2018-10-18-suisei': 'https://cdn.yuumi.link/images/songs/水星2.png',
  '2018-04-11-secret-answer': 'https://cdn.yuumi.link/images/songs/sa.jpg',
  '2018-02-21-romeo-to-cinderella': 'https://cdn.yuumi.link/images/songs/ro.jpg',
  '2017-11-19-alienate': 'https://cdn.yuumi.link/images/songs/a1.jpg',
}
const BILIBILI_COVER_URL_CACHE: Record<string, string> = {
  '2026-08-30-tenseiringo': 'https://i1.hdslb.com/bfs/archive/e0436c3360d1ae38654102b35875e0adaadfa39c.jpg',
  '2026-01-11-chronostasis': 'https://i0.hdslb.com/bfs/archive/25f7edb64fb39232b2d4eb25de681ace2c8cf269.jpg',
  '2024-10-02-uchiage-hanabi': 'https://i0.hdslb.com/bfs/archive/ffb9ec1010608c4001ad63bff18c5a2b6debe261.jpg',
  '2023-06-18-sing-2015': 'https://i1.hdslb.com/bfs/archive/3894bdfdade1bfb976615a98bf699760c3dba8df.jpg',
  '2022-12-25-seinaru-hi-no-inori': 'https://i1.hdslb.com/bfs/archive/6b13fec1cc91646eb7bbdf387011da1f1f4032d4.jpg',
  '2022-11-11-seishun-complex': 'https://i0.hdslb.com/bfs/archive/ae1f20d6702c1ae021997244cbdbba9d87229d12.jpg',
  '2022-11-11-karakara': 'https://i0.hdslb.com/bfs/archive/5f2e149d26f5cc0449ca0911deabf70630566ca6.jpg',
  '2022-11-08-guitar-to-kodoku': 'https://i2.hdslb.com/bfs/archive/7bf98ea312316237501e89b7e037012e5a956fd3.jpg',
  '2022-11-05-parade': 'https://i0.hdslb.com/bfs/archive/e38ad77d7b2a7adef6015e2f030e86eacc0afce5.jpg',
  '2022-10-12-ssfwl': 'https://i0.hdslb.com/bfs/archive/45d2281a5a2f4b5c866375c8a6cd0feb1e26abde.jpg',
  '2022-10-07-nagareyuku-kumo': 'https://i0.hdslb.com/bfs/archive/f5f2320dea8734c32dfe9d3ec0d76079a8935c5a.jpg',
  '2022-08-12-hikaru-nara': 'https://i1.hdslb.com/bfs/archive/c1abdcb99440883657694b48d44533f46c7e7300.jpg',
  '2022-06-04-romance-no-yakusoku': 'https://i1.hdslb.com/bfs/archive/38bd1124c75daf156ebd4b0ac334462112ccebcb.jpg',
  '2022-06-03-sparkle': 'https://i1.hdslb.com/bfs/archive/e1bd0f379f248ae039c584755d577742f648f971.jpg',
  '2022-06-02-lens': 'https://i2.hdslb.com/bfs/archive/53bf20ae63c63ba0cd527638bf95154f90c4cd9f.jpg',
  '2021-10-31-dancing-stars-on-me': 'https://i0.hdslb.com/bfs/archive/c93ffcba5a2a3434a00b02ac50f3450808847fc2.jpg',
  '2021-06-05-blessing': 'https://i0.hdslb.com/bfs/archive/6d4f90fbcc4b234b9a3db9ee4bfd257310547303.jpg',
  '2021-05-07-sing-and-smile': 'https://i2.hdslb.com/bfs/archive/080d4c0bb81aee12a0e21af9427890d04e5723b5.jpg',
  '2021-03-10-haru-dorobou': 'https://i0.hdslb.com/bfs/archive/afd35ed18943aab6a46613f4835f9a924acece08.jpg',
  '2020-12-06-hitchcock': 'https://i0.hdslb.com/bfs/archive/e207894550cbd56e6aa4ad470c523d1a550ad0c6.jpg',
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

function validOriginsForSong(song: Song) {
  const hasPlatformSource = Boolean(getNeteaseSongId(song) || getBilibiliVideoId(song))
  return hasPlatformSource
    ? new Set(['netease', 'bilibili'])
    : new Set([LEGACY_COVER_URLS[song.id] ? 'legacy' : 'placeholder'])
}

function isValidObject(song: Song, state: ObjectState) {
  return Boolean(state.exists && state.origin && validOriginsForSong(song).has(state.origin))
}

function shouldSkip(song: Song, states: ObjectState[]) {
  return states.every(state => isValidObject(song, state))
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
  timeoutMs = JSON_FETCH_TIMEOUT_MS,
) {
  let lastError: unknown
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        headers: requestHeaders(url, extraHeaders),
        signal: controller.signal,
      })
      if (!response.ok)
        throw new Error(`${new URL(url).hostname} returned ${response.status}`)
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
  const reason = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`${new URL(url).hostname} failed after ${FETCH_ATTEMPTS} attempts: ${reason}`)
}

async function fetchJson(url: string, extraHeaders: Record<string, string> = {}) {
  return await fetchWithRetry(url, response => response.json(), {
    Accept: 'application/json',
    ...extraHeaders,
  }) as any
}

function decodeBitmap(buffer: Buffer) {
  if (buffer.length < 54 || buffer.toString('ascii', 0, 2) !== 'BM')
    return null

  const pixelOffset = buffer.readUInt32LE(10)
  const dibSize = buffer.readUInt32LE(14)
  const width = buffer.readInt32LE(18)
  const signedHeight = buffer.readInt32LE(22)
  const height = Math.abs(signedHeight)
  const planes = buffer.readUInt16LE(26)
  const bitsPerPixel = buffer.readUInt16LE(28)
  const compression = buffer.readUInt32LE(30)

  if (dibSize < 40 || width <= 0 || height <= 0 || width * height > MAX_IMAGE_PIXELS)
    throw new Error('BMP dimensions are invalid or too large')
  if (planes !== 1 || ![24, 32].includes(bitsPerPixel) || compression !== 0)
    throw new Error(`Unsupported BMP format (${bitsPerPixel}-bit, compression ${compression})`)

  const channels = bitsPerPixel / 8
  const rowStride = Math.ceil((width * bitsPerPixel) / 32) * 4
  const requiredBytes = pixelOffset + rowStride * height
  if (pixelOffset < 54 || requiredBytes > buffer.length)
    throw new Error('BMP pixel data is incomplete')

  const pixels = Buffer.allocUnsafe(width * height * channels)
  const bottomUp = signedHeight > 0
  for (let outputY = 0; outputY < height; outputY += 1) {
    const sourceY = bottomUp ? height - outputY - 1 : outputY
    const sourceRow = pixelOffset + sourceY * rowStride
    const outputRow = outputY * width * channels
    for (let x = 0; x < width; x += 1) {
      const source = sourceRow + x * channels
      const output = outputRow + x * channels
      pixels[output] = buffer[source + 2]
      pixels[output + 1] = buffer[source + 1]
      pixels[output + 2] = buffer[source]
      if (channels === 4)
        pixels[output + 3] = buffer[source + 3] || 255
    }
  }

  return { pixels, width, height, channels }
}

async function normalizeImage(buffer: Buffer) {
  try {
    await sharp(buffer).metadata()
    return buffer
  }
  catch (originalError) {
    const bitmap = decodeBitmap(buffer)
    if (!bitmap)
      throw originalError

    return await sharp(bitmap.pixels, {
      raw: {
        width: bitmap.width,
        height: bitmap.height,
        channels: bitmap.channels as 3 | 4,
      },
    }).png().toBuffer()
  }
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
    IMAGE_FETCH_TIMEOUT_MS,
  )
  if (!buffer.length || buffer.length > MAX_SOURCE_BYTES)
    throw new Error('Image response is empty or too large')

  return await normalizeImage(buffer)
}

async function getNeteaseCover(songId: string) {
  const encodedIds = encodeURIComponent(`[${songId}]`)
  const endpoints = [
    `https://music.163.com/api/song/detail/?id=${songId}&ids=${encodedIds}`,
    `https://interface.music.163.com/api/song/detail/?id=${songId}&ids=${encodedIds}`,
  ]
  const results = await Promise.allSettled(endpoints.map(endpoint => fetchJson(endpoint)))
  const songs = results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map(result => result.value?.songs?.[0])
  const song = songs.find(Boolean)
  const cover = song?.album?.picUrl || song?.al?.picUrl
  if (typeof cover !== 'string' || !cover)
    throw new Error(`NetEase did not return a cover (${results.map(result => result.status === 'rejected' ? String(result.reason) : 'empty').join('; ')})`)

  const normalized = cover.startsWith('//') ? `https:${cover}` : cover.replace(/^http:/, 'https:')
  const urls = new Set([`${normalized}?param=800y800`])
  const hostname = new URL(normalized).hostname
  if (/^p\d+\.music\.126\.net$/.test(hostname)) {
    const alternate = new URL(normalized)
    alternate.hostname = hostname === 'p1.music.126.net' ? 'p2.music.126.net' : 'p1.music.126.net'
    urls.add(`${alternate.toString()}?param=800y800`)
  }

  return await Promise.any([...urls].map(url => fetchImage(url)))
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
    HTML_FETCH_TIMEOUT_MS,
  )
  const tags = html.match(/<meta\b[^>]*>/gi) || []
  const tag = tags.find(item => /(?:property|itemprop)=["'](?:og:image|image)["']/i.test(item))
  const cover = tag?.match(/content=["']([^"']+)["']/i)?.[1]
  if (!cover)
    throw new Error('Bilibili video page did not return an og:image cover')
  return cover.replace(/&amp;/g, '&').replace(/&#x2f;/gi, '/')
}

async function downloadBilibiliCover(cover: string, label: string) {
  const normalizedCover = cover.startsWith('//') ? `https:${cover}` : cover.replace(/^http:/, 'https:')
  const transformedCover = `${normalizedCover}@800w_800h_1c.webp`
  try {
    return await fetchImage(transformedCover, {
      Accept: 'image/avif,image/webp,image/*,*/*',
    })
  }
  catch (webpError) {
    console.warn(`[music-covers] ${label}: Bilibili WebP transform failed (${String(webpError)}), retrying the original image`)
    return await fetchImage(normalizedCover)
  }
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
  return await downloadBilibiliCover(cover, bvid)
}

async function resolveCover(song: Song): Promise<ResolvedCover> {
  const neteaseId = getNeteaseSongId(song)
  const bvid = getBilibiliVideoId(song)
  const hasPlatformSource = Boolean(neteaseId || bvid)
  const sourceErrors: string[] = []

  if (neteaseId) {
    try {
      return { buffer: await getNeteaseCover(neteaseId), origin: 'netease', temporary: false }
    }
    catch (error) {
      sourceErrors.push(`NetEase: ${String(error)}`)
      console.warn(`[music-covers] ${song.id}: NetEase cover failed (${String(error)})`)
    }
  }

  if (bvid) {
    const cachedCoverUrl = BILIBILI_COVER_URL_CACHE[song.id]
    if (cachedCoverUrl) {
      try {
        return {
          buffer: await downloadBilibiliCover(cachedCoverUrl, `${bvid} cached URL`),
          origin: 'bilibili',
          temporary: false,
        }
      }
      catch (error) {
        sourceErrors.push(`Bilibili cached URL: ${String(error)}`)
        console.warn(`[music-covers] ${song.id}: cached Bilibili cover failed (${String(error)})`)
      }
    }

    try {
      return { buffer: await getBilibiliCover(bvid), origin: 'bilibili', temporary: false }
    }
    catch (error) {
      sourceErrors.push(`Bilibili API: ${String(error)}`)
      console.warn(`[music-covers] ${song.id}: Bilibili cover failed (${String(error)})`)
    }
  }

  const legacyCoverUrl = LEGACY_COVER_URLS[song.id]
  if (legacyCoverUrl) {
    try {
      return {
        buffer: await fetchImage(legacyCoverUrl),
        origin: hasPlatformSource ? 'fallback' : 'legacy',
        temporary: hasPlatformSource,
      }
    }
    catch (error) {
      sourceErrors.push(`legacy CDN: ${String(error)}`)
      console.warn(`[music-covers] ${song.id}: legacy cover failed (${String(error)})`)
    }
  }

  if (hasPlatformSource)
    throw new Error(`${song.id}: all cover sources failed (${sourceErrors.join('; ')})`)

  return {
    buffer: PLACEHOLDER_SVG,
    origin: 'placeholder',
    temporary: false,
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
  const uploads: Promise<void>[] = []
  if (!isValidObject(song, states[0]))
    uploads.push(uploadCover(keys.thumbnail, thumbnail, resolved))
  if (!isValidObject(song, states[1]))
    uploads.push(uploadCover(keys.cover, cover, resolved))
  await Promise.all(uploads)
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

async function checkCoverSources(songIds: string[]) {
  const targets = songs.filter(song => songIds.includes(song.id))
  const missing = songIds.filter(id => !targets.some(song => song.id === id))
  if (missing.length)
    throw new Error(`Unknown song IDs: ${missing.join(', ')}`)

  for (const song of targets) {
    const resolved = await resolveCover(song)
    await renderCover(resolved.buffer, 32, 60)
    console.log(`[music-covers] ${song.id}: source check passed (${resolved.origin})`)
  }
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

const sourceCheckIds = process.argv
  .filter(argument => argument.startsWith('--check-source='))
  .map(argument => argument.slice('--check-source='.length))

if (sourceCheckIds.length) {
  checkCoverSources(sourceCheckIds).catch((error) => {
    console.error(`[music-covers] source check failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
else {
  void main()
}
