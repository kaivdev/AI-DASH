import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'

interface TaskDetailDialogProps {
  open: boolean
  task: any
  employeeName: string | null
  projectName: string | null
  inline?: boolean
  onClose: () => void
  onEdit: (task: any) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskDetailDialog({ open, task, employeeName, projectName, inline = false, onClose, onEdit, onToggle, onDelete }: TaskDetailDialogProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (open) {
      setShow(true)
      if (!inline) {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
      }
    } else {
      // small delay for out animation
      const t = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(t)
    }
  }, [open, inline])

  if (!open || !task) return null

  const panel = (
    <div className={`w-full max-w-xl rounded-lg border bg-background shadow-xl transition-all duration-200 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      <div className="p-5 border-b">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Подробности задачи</h3>
          <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="text-xs mb-1 text-muted-foreground">Содержание</div>
          <div className="text-sm break-words">{task.content}</div>
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
          <div>
            <div className="text-xs text-muted-foreground">Создано</div>
            <div>{task.created_at || '—'}</div>
          </div>
          {task.updated_at && (
            <div>
              <div className="text-xs text-muted-foreground">Обновлено</div>
              <div>{task.updated_at}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t">
          <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={() => onEdit(task)} title="Редактировать" aria-label="Редактировать">
            <Pencil className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={() => onToggle(task.id)} title={task.done ? 'Снять' : 'Готово'} aria-label={task.done ? 'Снять' : 'Готово'}>
            {task.done ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
          </button>
          <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={() => onDelete(task.id)} title="Удалить" aria-label="Удалить">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  if (inline) {
    return (
      <div className="absolute inset-0 z-40">
        <div className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {panel}
        </div>
      </div>
    )
  }

  const node = (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {panel}
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 