import { useEffect, useState } from 'react'

interface DocSummary {
  id: string
  title: string
  updatedAt: string
  owner: { name: string }
}

interface DocListViewProps {
  onOpen: (docId: string) => void
}

export function DocListView({ onOpen }: DocListViewProps) {
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/docs', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json() as Promise<DocSummary[]>
      })
      .then(data => { setDocs(data); setLoading(false) })
      .catch(() => { setError('Could not load documents. Is the server running?'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const createDoc = async () => {
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: 'Untitled' }),
    })
    if (res.ok) {
      const doc = await res.json() as DocSummary
      onOpen(doc.id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <button
            onClick={createDoc}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            New document
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">Loading…</p>
        )}

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && docs.length === 0 && (
          <p className="text-sm text-gray-500">No documents yet. Create one to get started.</p>
        )}

        <ul className="flex flex-col gap-2">
          {docs.map(doc => (
            <li key={doc.id}>
              <button
                onClick={() => onOpen(doc.id)}
                className="w-full text-left rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900">{doc.title || 'Untitled'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(doc.updatedAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
