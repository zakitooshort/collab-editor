import { useState, useEffect } from 'react'
import { EditorView } from './views/EditorView'
import { DocListView } from './views/DocListView'
import { JoinView } from './views/JoinView'

type View =
  | { screen: 'join' }
  | { screen: 'list' }
  | { screen: 'editor'; docId: string }

function getInitialView(): View {
  // Treat the URL path as the doc ID when non-empty.
  const path = window.location.pathname.slice(1)
  if (path) return { screen: 'editor', docId: path }
  const name = sessionStorage.getItem('collab-name')
  return name ? { screen: 'list' } : { screen: 'join' }
}

export default function App() {
  const [view, setView] = useState<View>(getInitialView)

  useEffect(() => {
    if (view.screen === 'editor') {
      window.history.pushState({}, '', `/${view.docId}`)
    } else {
      window.history.pushState({}, '', '/')
    }
  }, [view])

  if (view.screen === 'join') {
    return (
      <JoinView
        onJoin={(name, color) => {
          sessionStorage.setItem('collab-name', name)
          sessionStorage.setItem('collab-color', color)
          setView({ screen: 'list' })
        }}
      />
    )
  }

  if (view.screen === 'list') {
    return (
      <DocListView
        onOpen={(docId) => setView({ screen: 'editor', docId })}
      />
    )
  }

  return (
    <EditorView
      docId={view.docId}
      onBack={() => setView({ screen: 'list' })}
    />
  )
}
