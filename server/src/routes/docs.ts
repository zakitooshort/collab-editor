import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db/client'

export const docRoutes: FastifyPluginAsync = async (app) => {
  // GET /docs — list all documents
  app.get('/', async (_request, reply) => {
    const docs = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return reply.send(docs)
  })

  // POST /docs — create a new document
  app.post('/', async (request, reply) => {
    const { title } = (request.body as { title?: string }) ?? {}

    const doc = await prisma.document.create({
      data: { title: title ?? 'Untitled' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })

    return reply.code(201).send(doc)
  })

  // GET /docs/:id — get a single document
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const doc = await prisma.document.findUnique({ where: { id } })

    if (!doc) return reply.code(404).send({ error: 'Document not found' })

    return reply.send(doc)
  })

  // PATCH /docs/:id — update title
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { title } = request.body as { title: string }

    const doc = await prisma.document.findUnique({ where: { id } })

    if (!doc) return reply.code(404).send({ error: 'Document not found' })

    const updated = await prisma.document.update({
      where: { id },
      data: { title },
      select: { id: true, title: true, updatedAt: true },
    })

    return reply.send(updated)
  })

  // DELETE /docs/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const doc = await prisma.document.findUnique({ where: { id } })

    if (!doc) return reply.code(404).send({ error: 'Document not found' })

    await prisma.document.delete({ where: { id } })
    return reply.code(204).send()
  })
}
