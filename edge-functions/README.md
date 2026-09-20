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
loads cover and lyric metadata in this order: NetEase Cloud Music, Bilibili,
then the client-side CDN fallback configured for each song. No credentials or
storage binding are required. Responses are cached at the edge.

The Vite middleware in `dev-server.ts` mounts both music endpoints during
`pnpm dev`, so local development uses the same handlers as EdgeOne. For another
hosting provider, set `VITE_MUSIC_METADATA_API` to an endpoint implementing the
same GET contract, or port these stateless functions to that provider.

`api/bilibili-audio.js` is the same-origin streaming bridge used only for songs
that have no configured NetEase or self-hosted audio. It forwards HTTP range
requests to Bilibili's audio-only stream, so the deployment provider will carry
that audio bandwidth. If the provider has strict bandwidth limits, disable this
fallback or move the endpoint to a media-capable service.
