import { useEffect, useState } from 'react'
import type { Task } from '@/types/core'

interface TaskDetailDialogProps {
  open: boolean
  task: Task | null
  employeeName?: string | null
  projectName?: string | null
  onClose: () => void
  onEdit: (task: Task) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskDetailDialog({ open, task, employeeName, projectName, onClose, onEdit, onToggle, onDelete }: TaskDetailDialogProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (open) {
      setShow(true)
    } else {
      // small delay for out animation
      const t = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!open || !task) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full max-w-xl rounded-lg border bg-background shadow-xl transition-all duration-200 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-5 border-b">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold">Подробности задачи</h3>
              <button className="h-7 px-2 rounded border text-xs" onClick={onClose}>Закрыть</button>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <div className="text-xs mb-1 text-muted-foreground">Содержание</div>
              <div className="text-sm">{task.content}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Приоритет</div>
                <div>{task.priority}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Статус</div>
                <div>{task.done ? 'Выполнена' : 'Активна'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Срок</div>
                <div>{task.due_date || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Исполнитель</div>
                <div>{employeeName || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Проект</div>
                <div>{projectName || '—'}</div>
              </div>
            </div>
          </div>
          <div className="p-5 border-t flex items-center justify-end gap-2">
            <button className="h-8 px-3 rounded border text-sm" onClick={() => onToggle(task.id)}>
              {task.done ? 'Снять галочку' : 'Отметить выполненной'}
            </button>
            <button className="h-8 px-3 rounded border text-sm" onClick={() => onEdit(task)}>Редактировать</button>
            <button className="h-8 px-3 rounded border text-sm bg-red-600 border-red-600 text-primary-foreground" onClick={() => onDelete(task.id)}>Удалить</button>
          </div>
        </div>
      </div>
    </div>
  )
} 