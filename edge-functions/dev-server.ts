import type { Plugin } from 'vite'
import { onRequestGet as getBilibiliAudio } from './api/bilibili-audio.js'
import { onRequestGet as getMusicMetadata } from './api/music-metadata.js'

type EdgeHandler = (context: { request: Request }) => Promise<Response>

function createRequest(req: any) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers as Record<string, string | string[] | undefined>)) {
    if (Array.isArray(value)) {
      for (const item of value)
        headers.append(name, item)
    }
    else if (value !== undefined) {
      headers.set(name, value)
    }
  }

  const origin = `http://${req.headers.host || 'localhost'}`
  return new Request(new URL(req.url || '/', origin), {
    method: req.method || 'GET',
    headers,
  })
}

async function sendResponse(res: any, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, name) => res.setHeader(name, value))

  if (!response.body) {
    res.end()
    return
  }

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    res.write(Buffer.from(value))
  }
  res.end()
}

export function musicApiDevPlugin(): Plugin {
  return {
    name: 'yuumi-music-api-dev',
    apply: 'serve',
    configureServer(server) {
      const routes = new Map<string, EdgeHandler>([
        ['/api/music-metadata', getMusicMetadata],
        ['/api/bilibili-audio', getBilibiliAudio],
      ])

      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname
        const handler = routes.get(path)
        if (!handler)
          return next()

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET')
          res.end('Method Not Allowed')
          return
        }

        void handler({ request: createRequest(req) })
          .then(response => sendResponse(res, response))
          .catch((error) => {
            server.config.logger.error(`[yuumi-music-api-dev] ${String(error)}`)
            if (!res.headersSent) {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
            }
            res.end(JSON.stringify({ error: 'Local music API failed' }))
          })
      })
    },
  }
}
