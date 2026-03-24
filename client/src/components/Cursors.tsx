import type { RemoteCursor } from '../hooks/useCollabDoc'

interface CursorsProps {
  cursors: RemoteCursor[]
}

// shows a colored chip for each remote cursor
// proper inline overlays would need prosemirror decorations, thats a bigger lift
// this simpler version just shows whos active as a bar at the top of the editor
export function Cursors({ cursors }: CursorsProps) {
  if (cursors.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-1 pt-1">
      {cursors.map(cursor => (
        <span
          key={cursor.siteId}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: cursor.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
          {cursor.name}
        </span>
      ))}
    </div>
  )
}
