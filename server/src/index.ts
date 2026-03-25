import 'dotenv/config'
import './types'
import * as Y from 'yjs'
import Fastify from 'fastify'
import fjwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { WebSocketServer } from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { authRoutes } from './routes/auth'
import { docRoutes } from './routes/docs'
import { prisma } from './db/client'

const app = Fastify({ logger: true })

const hocuspocus = new Hocuspocus({
  async onLoadDocument({ documentName, document }) {
    try {
      const doc = await prisma.document.findUnique({ where: { id: documentName } })
      if (doc?.snapshot) {
        Y.applyUpdate(document, new Uint8Array(doc.snapshot as Buffer))
      }
    } catch (err) {
      app.log.error(err, `[hocus] Failed to load ${documentName}`)
    }
  },
  async onStoreDocument({ documentName, document }) {
    try {
      await prisma.document.update({
        where: { id: documentName },
        data: { snapshot: Buffer.from(Y.encodeStateAsUpdate(document)) },
      })
    } catch (err) {
      app.log.error(err, `[hocus] Failed to store ${documentName}`)
    }
  },
})

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

  app.get('/health', async () => ({ status: 'ok' }))

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })

  const wss = new WebSocketServer({ server: app.server })
  wss.on('connection', (ws, req) => {
    hocuspocus.handleConnection(ws, req)
  })
}

start()
