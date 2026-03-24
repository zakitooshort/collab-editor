import {
  type NodeId,
  type Op,
  type InsertOp,
  type DeleteOp,
  nodeIdKey,
  nodeIdEqual,
  compareNodeIds,
} from './operations'

interface RGANode {
  id: NodeId
  char: string
  afterId: NodeId | null
  deleted: boolean
}

export class RGADocument {
  private nodes: Map<string, RGANode> = new Map()
  private order: NodeId[] = []
  private clock: number = 0

  insert(afterId: NodeId | null, char: string, siteId: string): InsertOp {
    this.clock++
    const id: NodeId = { clock: this.clock, siteId }
    const op: InsertOp = { type: 'insert', id, afterId, char }
    this.applyInsert(op)
    return op
  }

  delete(nodeId: NodeId): DeleteOp {
    const op: DeleteOp = { type: 'delete', id: nodeId }
    this.applyDelete(op)
    return op
  }

  applyOp(op: Op): void {
    if (op.type === 'insert') {
      this.clock = Math.max(this.clock, op.id.clock)
      this.applyInsert(op)
    } else {
      this.applyDelete(op)
    }
  }

  private applyInsert(op: InsertOp): void {
    const key = nodeIdKey(op.id)
    if (this.nodes.has(key)) return

    const node: RGANode = {
      id: op.id,
      char: op.char,
      afterId: op.afterId,
      deleted: false,
    }
    const pos = this.findInsertPosition(op.afterId, op.id)
    this.order.splice(pos, 0, op.id)
    this.nodes.set(key, node)
  }

  private applyDelete(op: DeleteOp): void {
    const node = this.nodes.get(nodeIdKey(op.id))
    if (!node || node.deleted) return
    node.deleted = true
  }

  // finds where to slot in the new node
  //
  // the sequence is basically a dfs of a tree where each node's parent is its afterId
  // siblings (same parent) are sorted by priority - higher clock first, siteId breaks ties
  // we scan forward and track which siblings already won so we can skip their whole subtree
  private findInsertPosition(afterId: NodeId | null, newId: NodeId): number {
    let startIdx = -1
    if (afterId !== null) {
      startIdx = this.order.findIndex(id => nodeIdEqual(id, afterId))
    }

    let i = startIdx + 1
    const ancestors = new Set<string>()
    if (afterId !== null) ancestors.add(nodeIdKey(afterId))
    const pKey = afterId ? nodeIdKey(afterId) : null

    while (i < this.order.length) {
      const q = this.order[i]
      const qNode = this.nodes.get(nodeIdKey(q))!
      const qAfterKey = qNode.afterId ? nodeIdKey(qNode.afterId) : null

      if (qAfterKey === pKey) {
        // same parent as the new node, see who wins
        if (compareNodeIds(q, newId) > 0) {
          ancestors.add(nodeIdKey(q))
          i++
        } else {
          break
        }
      } else if (qAfterKey !== null && ancestors.has(qAfterKey)) {
        // inside a sibling's subtree that already won, skip it
        ancestors.add(nodeIdKey(q))
        i++
      } else {
        break
      }
    }

    return i
  }

  toText(): string {
    let text = ''
    for (const id of this.order) {
      const node = this.nodes.get(nodeIdKey(id))!
      if (!node.deleted) text += node.char
    }
    return text
  }

  // maps a visible char index to its node id
  // returns null if index is -1 (before the first char) or out of bounds
  getNodeIdAtIndex(index: number): NodeId | null {
    if (index < 0) return null
    let visible = 0
    for (const id of this.order) {
      const node = this.nodes.get(nodeIdKey(id))!
      if (!node.deleted) {
        if (visible === index) return id
        visible++
      }
    }
    return null
  }

  length(): number {
    let count = 0
    for (const id of this.order) {
      if (!this.nodes.get(nodeIdKey(id))!.deleted) count++
    }
    return count
  }
}
