import { ModuleCard } from '@/features/modules/ModuleCard'
import { useNotes } from '@/stores/useNotes'
import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'

export function NotesCard() {
  const notes = useNotes((s) => s.notes)
  const add = useNotes((s) => s.add)
  const update = useNotes((s) => s.update)
  const remove = useNotes((s) => s.remove)

  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string>('')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  function onQuickAdd() {
    const text = content.trim()
    if (!text) return
    const now = new Date().toISOString()
    add({ content: text, date: now.slice(0, 10), tags: [], created_at: now })
    setContent('')
  }

  function startEdit(n: any) {
    setEditingId(n.id)
    setEditTitle(n.title || '')
    setEditContent(n.content || '')
  }

  function saveEdit() {
    if (!editingId) return
    update(editingId, { title: editTitle || undefined, content: editContent })
    setEditingId('')
    setEditTitle('')
    setEditContent('')
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
              {editingId === n.id ? (
                <div className="mt-1 space-y-2">
                  <input className="h-8 px-2 rounded border bg-background w-full text-sm" value={editTitle} onChange={(e)=> setEditTitle(e.target.value)} placeholder="Title (optional)" />
                  <textarea className="px-2 py-2 rounded border bg-background w-full text-sm resize-none" rows={3} value={editContent} onChange={(e)=> setEditContent(e.target.value)} />
                  <div className="flex items-center gap-2 justify-end">
                    <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={saveEdit} title="Сохранить" aria-label="Сохранить"><Check className="h-3.5 w-3.5" /></button>
                    <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={()=> setEditingId('')} title="Отмена" aria-label="Отмена"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ) : (
                <>
                  {n.title && <div className="font-medium">{n.title}</div>}
                  <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={() => startEdit(n)} title="Редактировать" aria-label="Редактировать">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={() => remove(n.id)} title="Удалить" aria-label="Удалить">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </ModuleCard>
  )
} 