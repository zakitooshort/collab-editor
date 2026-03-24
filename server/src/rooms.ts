import type WebSocket from 'ws'

export interface ClientMeta {
  siteId: string
  name: string
  color: string
}

type Room = Map<WebSocket, ClientMeta>

const rooms = new Map<string, Room>()

function getOrCreateRoom(docId: string): Room {
  let room = rooms.get(docId)
  if (!room) {
    room = new Map()
    rooms.set(docId, room)
  }
  return room
}

export function joinRoom(docId: string, ws: WebSocket, meta: ClientMeta): void {
  getOrCreateRoom(docId).set(ws, meta)
}

export function leaveRoom(docId: string, ws: WebSocket): void {
  const room = rooms.get(docId)
  if (!room) return
  room.delete(ws)
  if (room.size === 0) rooms.delete(docId)
}

export function broadcast(
  docId: string,
  message: unknown,
  exclude?: WebSocket,
): void {
  const room = rooms.get(docId)
  if (!room) return
  const payload = JSON.stringify(message)
  for (const [client] of room) {
    if (client !== exclude && client.readyState === 1 /* OPEN */) {
      client.send(payload)
    }
  }
}

export function broadcastAll(docId: string, message: unknown): void {
  broadcast(docId, message, undefined)
}

export function getUsers(docId: string): ClientMeta[] {
  const room = rooms.get(docId)
  if (!room) return []
  return Array.from(room.values())
}
