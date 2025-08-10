import { ModuleCard } from '@/features/modules/ModuleCard'
import { useNotes } from '@/stores/useNotes'
import { useState } from 'react'

export function NotesCard() {
  const notes = useNotes((s) => s.notes)
  const add = useNotes((s) => s.add)
  const remove = useNotes((s) => s.remove)

  const [content, setContent] = useState('')

  function onQuickAdd() {
    const text = content.trim()
    if (!text) return
    add({ content: text, date: new Date().toISOString().slice(0, 10), tags: [] })
    setContent('')
  }

  return (
    <ModuleCard id="notes" title="Notes" size="2x1">
      <div className="flex flex-col h-full gap-3">
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Quick add note..."
            className="flex-1 h-9 px-3 rounded border bg-background"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onQuickAdd()
            }}
          />
          <button className="h-9 px-3 rounded border" onClick={onQuickAdd}>Add</button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto space-y-2">
          {notes.length === 0 && (
            <div className="text-sm text-muted-foreground">No notes yet.</div>
          )}
          {notes.map((n) => (
            <div key={n.id} className="rounded border p-3">
              <div className="text-xs text-muted-foreground">{n.date}</div>
              {n.title && <div className="font-medium">{n.title}</div>}
              <div className="text-sm line-clamp-3">{n.content}</div>
              <div className="mt-2 text-right">
                <button className="text-xs text-red-600 hover:underline" onClick={() => remove(n.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModuleCard>
  )
} 