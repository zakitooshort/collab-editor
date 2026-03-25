import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

export interface RemoteUser {
  clientId: number
  name: string
  color: string
}

export interface UseCollabDocResult {
  ydoc: Y.Doc
  provider: HocuspocusProvider | null
  remoteUsers: RemoteUser[]
}

const WS_BASE = window.location.origin.replace(/^http/, 'ws').replace(':5173', ':3001')

export function useCollabDoc(docId: string): UseCollabDocResult {
  const ydocRef = useRef(new Y.Doc())
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])

  useEffect(() => {
    const ydoc = ydocRef.current
    const name = sessionStorage.getItem('collab-name') ?? 'Anonymous'
    const color = sessionStorage.getItem('collab-color') ?? '#3b82f6'

    const wsProvider = new HocuspocusProvider({
      url: WS_BASE,
      name: docId,
      document: ydoc,
      token: '',
    })

    const awareness = wsProvider.awareness
    if (awareness) {
      awareness.setLocalStateField('user', { name, color })

      const onAwarenessChange = () => {
        const others: RemoteUser[] = []
        awareness.getStates().forEach((state, clientId) => {
          if (clientId !== awareness.clientID && state.user) {
            others.push({ clientId, name: state.user.name, color: state.user.color })
          }
        })
        setRemoteUsers(others)
      }

      awareness.on('change', onAwarenessChange)
      setProvider(wsProvider)

      return () => {
        awareness.off('change', onAwarenessChange)
        wsProvider.destroy()
      }
    }

    setProvider(wsProvider)
    return () => { wsProvider.destroy() }
  }, [docId])

  return { ydoc: ydocRef.current, provider, remoteUsers }
}
