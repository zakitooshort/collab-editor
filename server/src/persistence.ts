import { prisma } from './db/client'
import type { Op } from '@collab-editor/shared'

export async function saveOp(docId: string, op: Op): Promise<void> {
  await prisma.operation.create({
    data: {
      documentId: docId,
      data: op as object,
    },
  })
}

export async function getOps(docId: string): Promise<Op[]> {
  const rows = await prisma.operation.findMany({
    where: { documentId: docId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(r => r.data as unknown as Op)
}
