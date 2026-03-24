import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { UseCollabDocResult } from '../hooks/useCollabDoc'

interface EditorProps {
  collab: UseCollabDocResult
}

export function Editor({ collab }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none min-h-[60vh] px-4 py-3 text-gray-900',
      },
    },
  })

  // tell the collab hook about the editor once tiptap is ready
  useEffect(() => {
    if (!editor) return
    collab.onEditorReady(editor)
  }, [editor, collab])

  // send cursor position when selection moves
  useEffect(() => {
    if (!editor) return
    const handler = () => {
      const { from } = editor.state.selection
      // from is 1-based and includes node boundaries, -2 gives us the 0-based char index
      const charIndex = from - 2
      const afterId = charIndex >= 0 ? null : null // resolved in useCollabDoc
      collab.sendCursor(afterId)
    }
    editor.on('selectionUpdate', handler)
    return () => { editor.off('selectionUpdate', handler) }
  }, [editor, collab])

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
      <EditorContent editor={editor} />
    </div>
  )
}
