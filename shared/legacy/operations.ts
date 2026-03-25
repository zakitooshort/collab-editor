export interface NodeId {
  clock: number
  siteId: string
}

export interface InsertOp {
  type: 'insert'
  id: NodeId
  afterId: NodeId | null
  char: string
}

export interface DeleteOp {
  type: 'delete'
  id: NodeId
}

export type Op = InsertOp | DeleteOp

export function nodeIdKey(id: NodeId): string {
  return `${id.clock}:${id.siteId}`
}

export function nodeIdEqual(a: NodeId, b: NodeId): boolean {
  return a.clock === b.clock && a.siteId === b.siteId
}

// positive = a wins (appears first), negative = b wins
// higher clock wins, equal clock falls back to siteId
export function compareNodeIds(a: NodeId, b: NodeId): number {
  if (a.clock !== b.clock) return a.clock - b.clock
  return a.siteId.localeCompare(b.siteId)
}
