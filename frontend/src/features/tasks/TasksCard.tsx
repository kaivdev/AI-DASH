import { ModuleCard } from '@/features/modules/ModuleCard'
import { useTasks } from '@/stores/useTasks'
import { useState } from 'react'

export function TasksCard() {
  const tasks = useTasks((s) => s.tasks)
  const add = useTasks((s) => s.add)
  const toggle = useTasks((s) => s.toggle)
  const remove = useTasks((s) => s.remove)

  const [text, setText] = useState('')

  function onAdd() {
    const t = text.trim()
    if (!t) return
    add(t)
    setText('')
  }

  return (
    <ModuleCard id="tasks" title="Tasks / TODO" size="2x1">
      <div className="flex flex-col h-full gap-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quick add task..."
            className="flex-1 h-9 px-3 rounded border bg-background"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAdd()
            }}
          />
          <button className="h-9 px-3 rounded border" onClick={onAdd}>Add</button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto space-y-1">
          {tasks.length === 0 && (
            <div className="text-sm text-muted-foreground">No tasks yet.</div>
          )}
          {tasks.map((t) => (
            <label key={t.id} className="flex items-start gap-3 rounded border p-2">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-sm">
                  {t.content}
                  {t.due && (
                    <span className="ml-2 text-xs text-muted-foreground">{t.due}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Priority: {t.priority}</div>
              </div>
              <button className="text-xs text-red-600 hover:underline" onClick={(e) => { e.preventDefault(); remove(t.id) }}>Delete</button>
            </label>
          ))}
        </div>
      </div>
    </ModuleCard>
  )
} 