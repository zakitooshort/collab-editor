import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db/client'
import { authenticate } from '../middleware/auth'

export const docRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate)

  // GET /docs — list all docs where the caller is owner or collaborator
  app.get('/', async (request, reply) => {
    const { userId } = request.user

    const docs = await prisma.document.findMany({
      where: {
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        owner: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return reply.send(docs)
  })

  // POST /docs — create a new document
  app.post('/', async (request, reply) => {
    const { userId } = request.user
    const { title } = (request.body as { title?: string }) ?? {}

    const doc = await prisma.document.create({
      data: { title: title ?? 'Untitled', ownerId: userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true, ownerId: true },
    })

    return reply.code(201).send(doc)
  })

  // GET /docs/:id — get a single document with collaborators
  app.get('/:id', async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    if (!doc) return reply.code(404).send({ error: 'Document not found' })

    const hasAccess =
      doc.ownerId === userId || doc.collaborators.some((c) => c.userId === userId)

    if (!hasAccess) return reply.code(403).send({ error: 'Forbidden' })

    return reply.send(doc)
  })

  // PATCH /docs/:id — update title (owner or editor only)
  app.patch('/:id', async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }
    const { title } = request.body as { title: string }

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { collaborators: { select: { userId: true, role: true } } },
    })

    if (!doc) return reply.code(404).send({ error: 'Document not found' })

    const collab = doc.collaborators.find((c) => c.userId === userId)
    const canEdit = doc.ownerId === userId || collab?.role === 'EDITOR'

    if (!canEdit) return reply.code(403).send({ error: 'Forbidden' })

    const updated = await prisma.document.update({
      where: { id },
      data: { title },
      select: { id: true, title: true, updatedAt: true },
    })

    return reply.send(updated)
  })

  // DELETE /docs/:id — owner only
  app.delete('/:id', async (request, reply) => {
    const { userId } = request.user
    const { id } = request.params as { id: string }

    const doc = await prisma.document.findUnique({ where: { id } })

    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    if (doc.ownerId !== userId) return reply.code(403).send({ error: 'Forbidden' })

    await prisma.document.delete({ where: { id } })
    return reply.code(204).send()
  })
}
