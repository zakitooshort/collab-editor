import 'dotenv/config'
import './types'
import { randomBytes } from 'node:crypto'
import { URL } from 'node:url'
import Fastify from 'fastify'
import fjwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { WebSocketServer } from 'ws'
import { authRoutes } from './routes/auth'
import { docRoutes } from './routes/docs'
import { joinRoom, leaveRoom, broadcast, getUsers } from './rooms'
import { saveOp, getOps } from './persistence'
import type { Op } from '@collab-editor/shared'

const app = Fastify({ logger: true })

async function start() {
  await app.register(cors, {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  })

  await app.register(fjwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  })

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(docRoutes, { prefix: '/docs' })

  // REST endpoint so new clients can fetch the full op log on mount
  app.get<{ Params: { id: string } }>('/docs/:id/ops', async (req, reply) => {
    const ops = await getOps(req.params.id)
    return ops
  })

  app.get('/health', async () => ({ status: 'ok' }))

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })

  // attach ws to the same http server fastify is on
  const wss = new WebSocketServer({ server: app.server })

  wss.on('connection', async (ws, req) => {
    app.log.info({ url: req.url }, 'ws connected')
    // pull docId and client info out of the url (/ws/:docId?name=&color=)
    const base = `http://localhost`
    const url = new URL(req.url ?? '/', base)
    const pathParts = url.pathname.split('/')
    const docId = pathParts[pathParts.length - 1]

    if (!docId) {
      ws.close(1008, 'Missing docId')
      return
    }

    const name = url.searchParams.get('name') ?? 'Anonymous'
    const color = url.searchParams.get('color') ?? '#' + randomBytes(3).toString('hex')
    const siteId = randomBytes(8).toString('hex')

    const meta = { siteId, name, color }
    joinRoom(docId, ws, meta)

    // send the full op log so the client can catch up
    try {
      const ops = await getOps(docId)
      ws.send(JSON.stringify({ type: 'init', ops, siteId }))
    } catch {
      ws.close(1011, 'Failed to load operations')
      return
    }

    // let everyone know someone joined
    broadcast(docId, { type: 'presence', users: getUsers(docId) })

    ws.on('message', async (raw) => {
      let msg: { type: string; op?: Op; afterId?: unknown }
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }

      app.log.info({ type: msg.type }, 'ws message')
      if (msg.type === 'op' && msg.op) {
        try {
          await saveOp(docId, msg.op)
        } catch (err) {
          app.log.error(err, 'Failed to persist op')
          ws.send(JSON.stringify({ type: 'error', message: 'failed to persist op' }))
        }
        // fan out to everyone else in the room
        broadcast(docId, { type: 'op', op: msg.op, siteId }, ws)
      }

      if (msg.type === 'cursor') {
        broadcast(docId, { type: 'cursor', siteId, afterId: msg.afterId, color: meta.color, name: meta.name }, ws)
      }
    })

    ws.on('close', () => {
      leaveRoom(docId, ws)
      broadcast(docId, { type: 'presence', users: getUsers(docId) })
    })

    ws.on('error', (err) => {
      app.log.error(err, 'WebSocket error')
      leaveRoom(docId, ws)
    })
  })
}

start()
