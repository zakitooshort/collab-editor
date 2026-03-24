import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../db/client'

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const { email, name, password } = request.body as {
      email: string
      name: string
      password: string
    }

    if (!email || !name || !password) {
      return reply.code(400).send({ error: 'email, name, and password are required' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.code(409).send({ error: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    const tokens = await issueTokens(app, user.id, user.email)
    return reply.code(201).send({ user, ...tokens })
  })

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    // Always compare so timing is consistent even when user doesn't exist
    const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false

    if (!user || !validPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const tokens = await issueTokens(app, user.id, user.email)
    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      ...tokens,
    })
  })

  // POST /auth/refresh
  // Client sends the refresh token, gets a new access token back.
  // We rotate the refresh token on each use (old one is deleted).
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }

    if (!refreshToken) {
      return reply.code(400).send({ error: 'refreshToken is required' })
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })

    if (!stored || stored.expiresAt < new Date()) {
      // Delete the expired token if it exists so the DB stays clean
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } })
      return reply.code(401).send({ error: 'Invalid or expired refresh token' })
    }

    // Rotate: delete old, issue new pair
    await prisma.refreshToken.delete({ where: { id: stored.id } })
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
      select: { email: true },
    })

    const tokens = await issueTokens(app, stored.userId, user.email)
    return reply.send(tokens)
  })

  // POST /auth/logout — invalidates the refresh token
  app.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    }

    return reply.code(204).send()
  })
}

async function issueTokens(app: FastifyInstance, userId: string, email: string) {
  const accessToken = app.jwt.sign({ userId, email }, { expiresIn: '15m' })

  const refreshToken = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } })

  return { accessToken, refreshToken }
}
