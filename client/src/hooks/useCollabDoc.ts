import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { RGADocument } from '@collab-editor/shared'
import type { Op, NodeId } from '@collab-editor/shared'
import { WSClient } from '../lib/ws-client'

const API_BASE = '/api'
const WS_BASE = window.location.origin.replace(/^http/, 'ws').replace(':5173', ':3001')

export interface RemoteUser {
  siteId: string
  name: string
  color: string
}

export interface RemoteCursor {
  siteId: string
  afterId: NodeId | null
  color: string
  name: string
}

interface UseCollabDocResult {
  siteId: string | null
  remoteUsers: RemoteUser[]
  remoteCursors: RemoteCursor[]
  onEditorReady: (editor: Editor) => void
  sendCursor: (afterId: NodeId | null) => void
}

// connects a tiptap editor to the crdt document
//
// on mount: fetch op log and replay into RGADocument, set initial content
// then open ws - on init replay ops again (idempotent), on op apply + refresh editor
// when user types: diff old vs new text, turn changes into crdt ops, send to server
export function useCollabDoc(docId: string): UseCollabDocResult {
  const crdtRef = useRef(new RGADocument())
  const editorRef = useRef<Editor | null>(null)
  const prevTextRef = useRef('')
  const siteIdRef = useRef<string | null>(null)
  const wsRef = useRef<WSClient | null>(null)
  const applyingRemoteRef = useRef(false)

  const [siteId, setSiteId] = useState<string | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])

  const pushToEditor = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor) return
    applyingRemoteRef.current = true
    const { from, to } = editor.state.selection
    editor.commands.setContent(text, false)
    // restore cursor position as best we can
    try {
      editor.commands.setTextSelection({ from, to })
    } catch {
      // selection may be out of bounds after content change — ignore
    }
    applyingRemoteRef.current = false
  }, [])

  const applyRemoteOp = useCallback((op: Op) => {
    crdtRef.current.applyOp(op)
    prevTextRef.current = crdtRef.current.toText()
    pushToEditor(prevTextRef.current)
  }, [pushToEditor])

  const handleMessage = useCallback((msg: unknown) => {
    const m = msg as Record<string, unknown>

    if (m.type === 'init') {
      const ops = (m.ops as Op[]) ?? []
      ops.forEach(op => crdtRef.current.applyOp(op))
      prevTextRef.current = crdtRef.current.toText()
      pushToEditor(prevTextRef.current)

      if (m.siteId) {
        siteIdRef.current = m.siteId as string
        setSiteId(m.siteId as string)
      }
    }

    if (m.type === 'op' && m.op) {
      applyRemoteOp(m.op as Op)
    }

    if (m.type === 'presence') {
      const users = (m.users as RemoteUser[]) ?? []
      setRemoteUsers(users.filter(u => u.siteId !== siteIdRef.current))
    }

    if (m.type === 'cursor') {
      const { siteId: sid, afterId, color, name } = m as RemoteCursor & { siteId: string }
      if (sid === siteIdRef.current) return
      setRemoteCursors(prev => {
        const filtered = prev.filter(c => c.siteId !== sid)
        return [...filtered, { siteId: sid, afterId: afterId ?? null, color, name }]
      })
    }
  }, [applyRemoteOp, pushToEditor])

  useEffect(() => {
    const crdt = crdtRef.current

    // load existing ops before opening the socket so we start from the right state
    fetch(`${API_BASE}/docs/${docId}/ops`)
      .then(r => r.json())
      .then((ops: Op[]) => {
        ops.forEach(op => crdt.applyOp(op))
        prevTextRef.current = crdt.toText()
        pushToEditor(prevTextRef.current)
      })
      .catch(() => {
        // if this fails the ws init message catches us up anyway
      })

    const name = sessionStorage.getItem('collab-name') ?? 'Anonymous'
    const color = sessionStorage.getItem('collab-color') ?? randomColor()
    sessionStorage.setItem('collab-color', color)

    const url = `${WS_BASE}/ws/${docId}?name=${encodeURIComponent(name)}&color=${encodeURIComponent(color)}`
    wsRef.current = new WSClient({ url, onMessage: handleMessage })

    return () => {
      wsRef.current?.destroy()
    }
  }, [docId, handleMessage, pushToEditor])

  // runs on every tiptap update
  // diffs prev text vs new text and turns changes into crdt ops
  const onEditorUpdate = useCallback((newText: string) => {
    if (applyingRemoteRef.current) return

    const crdt = crdtRef.current
    const prev = prevTextRef.current
    const ops: Op[] = []

    let i = 0
    let j = 0

    while (i < prev.length || j < newText.length) {
      if (i < prev.length && j < newText.length && prev[i] === newText[j]) {
        i++
        j++
        continue
      }

      if (j < newText.length && (i >= prev.length || prev[i] !== newText[j])) {
        // new char at j
        const afterId = crdt.getNodeIdAtIndex(j - 1)
        const op = crdt.insert(afterId, newText[j], siteIdRef.current ?? 'local')
        ops.push(op)
        // only advance j, crdt already reflects the insert
        j++
      } else {
        // char at i was removed
        const nodeId = crdt.getNodeIdAtIndex(i)
        if (nodeId) {
          const op = crdt.delete(nodeId)
          ops.push(op)
        }
        i++
      }
    }

    prevTextRef.current = crdt.toText()

    for (const op of ops) {
      wsRef.current?.send({ type: 'op', op })
    }
  }, [])

  const onEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor

    // hook into tiptap's update event
    const originalUpdate = editor.options.onUpdate
    editor.setOptions({
      onUpdate: ({ editor: e, transaction }) => {
        originalUpdate?.({ editor: e, transaction })
        if (transaction.docChanged) {
          onEditorUpdate(e.getText())
        }
      },
    })

    // push crdt content in case it loaded before the editor was ready
    const text = crdtRef.current.toText()
    if (text) {
      pushToEditor(text)
      prevTextRef.current = text
    }
  }, [onEditorUpdate, pushToEditor])

  const sendCursor = useCallback((afterId: NodeId | null) => {
    wsRef.current?.send({ type: 'cursor', afterId })
  }, [])

  return { siteId, remoteUsers, remoteCursors, onEditorReady, sendCursor }
}

function randomColor(): string {
  const palette = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  ]
  return palette[Math.floor(Math.random() * palette.length)]
}
