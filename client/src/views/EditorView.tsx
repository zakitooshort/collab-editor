import { useCollabDoc } from '../hooks/useCollabDoc'
import { Editor } from '../components/Editor'
import { UserList } from '../components/UserList'
import { Cursors } from '../components/Cursors'

interface EditorViewProps {
  docId: string
  onBack: () => void
}

export function EditorView({ docId, onBack }: EditorViewProps) {
  const ownName = sessionStorage.getItem('collab-name') ?? 'Anonymous'
  const ownColor = sessionStorage.getItem('collab-color') ?? '#3b82f6'
  const collab = useCollabDoc(docId)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Docs
        </button>
        <span className="text-xs text-gray-400 font-mono select-all">{docId}</span>
        {collab.siteId && (
          <span className="ml-auto text-xs text-gray-400 hidden sm:block">
            site: <span className="font-mono">{collab.siteId.slice(0, 8)}</span>
          </span>
        )}
      </header>

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex flex-col flex-1 gap-2 min-w-0">
          <Cursors cursors={collab.remoteCursors} />
          <Editor collab={collab} />
        </div>
        <UserList
          users={collab.remoteUsers}
          ownName={ownName}
          ownColor={ownColor}
        />
      </div>
    </div>
  )
}
