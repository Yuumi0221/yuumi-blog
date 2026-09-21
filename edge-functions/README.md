# Moments like on EdgeOne

The moments page talks only to the HTTP endpoint configured in
`pages/moments/index.md`. Storage is a deployment concern and is not exposed to
the browser.

For EdgeOne Makers:

1. Create or choose a KV namespace.
2. Bind that namespace to the deployed project with the variable name
   `moments_like`.
3. Make sure this `edge-functions` directory is under the project's configured
   root directory.
4. Deploy the project. The file at `api/moments-like.js` becomes
   `/api/moments-like`.

The namespace can have any name and does not need pre-created moment records.
The function hashes each moment route path to a KV-compatible SHA-256 key and
creates the record on the first like.

EdgeOne KV does not expose an atomic increment/decrement operation. Concurrent
updates may overwrite each other, so this example is an eventually consistent
lightweight counter rather than a transactionally exact counter.

Other hosting providers can implement the same endpoint contract with their own
serverless function and storage. Sites without a server-side storage option
should leave `moments.likes.enabled` disabled.

## Music metadata proxy

`api/music-metadata.js` exposes `/api/music-metadata` for the songs archive. It
loads lyrics in this order: NetEase Cloud Music, then Bilibili subtitles. Cover
images are generated during the EdgeOne build and served from COS/CDN, while
audio is resolved only after the visitor presses play. No credentials or
storage binding are required by this runtime endpoint. Responses are cached at
the edge.

The Vite middleware in `dev-server.ts` mounts both music endpoints during
`pnpm dev`, so local development uses the same handlers as EdgeOne. For another
hosting provider, set `VITE_MUSIC_METADATA_API` to an endpoint implementing the
same GET contract, or port these stateless functions to that provider.

`api/bilibili-audio.js` is the same-origin streaming bridge used only for songs
that have no configured NetEase or self-hosted audio. It forwards HTTP range
requests to Bilibili's audio-only stream, so the deployment provider will carry
that audio bandwidth. If the provider has strict bandwidth limits, disable this
fallback or move the endpoint to a media-capable service.

## Build-time music covers

`pnpm run sync:music-covers` reads `pages/posts/songs.config.ts`, generates a
160px thumbnail and an 800px cover, and uploads missing images below
`music/covers/` in Tencent COS. `pnpm run build:edgeone` runs that sync before
the existing full build. A normal local `pnpm run build` does not require COS.
Song data no longer contains legacy cover URLs. Five archive-only songs are
migrated from their existing `images/songs/` files by the sync task; browsers
only request these flat object paths:

```text
music/covers/{songId}/thumb.webp
music/covers/{songId}/cover.webp
```

For Bilibili-only songs, the sync task creates an anonymous Bilibili device
session, signs the WBI video-info request, and downloads the returned cover as
WebP. The unsigned video-info endpoint and the page `og:image` remain fallbacks.
No Bilibili account or login cookie is required. Stable covers use a one-day
browser/CDN cache because these object paths are overwritten in place; temporary
fallback covers use a five-minute cache and are retried by the next deployment.

Configure these EdgeOne build environment variables:

```text
MUSIC_COS_SECRET_ID
MUSIC_COS_SECRET_KEY
TENCENT_COS_BUCKET
TENCENT_COS_REGION
VITE_MUSIC_COVER_BASE_URL=https://cdn.yuumi.link/music/covers
```

Keep the existing Vite preset, root directory, `dist` output, install command,
and Node.js setting. Change only the EdgeOne build command to
`pnpm run build:edgeone`.

The secret variables avoid Tencent's reserved `TENCENTCLOUD_` prefix and must
never use the `VITE_` prefix. Use a dedicated CAM identity limited to reading
object metadata and uploading objects under `music/covers/*`.
