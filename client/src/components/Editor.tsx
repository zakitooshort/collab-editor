import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface EditorProps {
  ydoc: Y.Doc
  provider: HocuspocusProvider | null
}

export function Editor({ ydoc, provider }: EditorProps) {
  const name = sessionStorage.getItem('collab-name') ?? 'Anonymous'
  const color = sessionStorage.getItem('collab-color') ?? '#3b82f6'

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      ...(provider
        ? [CollaborationCursor.configure({ provider, user: { name, color } })]
        : []),
    ],
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[60vh] px-4 py-3 text-gray-900',
      },
    },
  })

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
      <EditorContent editor={editor} />
    </div>
  )
}
