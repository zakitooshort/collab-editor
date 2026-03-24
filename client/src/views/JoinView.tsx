import { useState } from 'react'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
]

interface JoinViewProps {
  onJoin: (name: string, color: string) => void
}

export function JoinView({ onJoin }: JoinViewProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) onJoin(name.trim(), color)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Collab Editor</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a name to get started</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Display name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alice"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Cursor color</span>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#1f2937' : 'transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </label>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
