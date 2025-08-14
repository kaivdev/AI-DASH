import { useEffect, useState } from 'react'
import { Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'

interface TaskDetailDialogProps {
  open: boolean
  task: any
  employeeName: string | null
  projectName: string | null
  employees: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  inline?: boolean
  onClose: () => void
  onEdit: (task: any) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskDetailDialog({ open, task, employeeName, projectName, employees, projects, inline = false, onClose, onEdit, onToggle, onDelete }: TaskDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState('M')
  const [due, setDue] = useState('')
  const [assignee, setAssignee] = useState('')
  const [projectId, setProjectId] = useState('')
  const [hours, setHours] = useState<string>('0')
  const [billable, setBillable] = useState<boolean>(true)
  const [rateOverride, setRateOverride] = useState<string>('')

  useEffect(() => {
    if (task) {
      setContent(task.content || '')
      setPriority(task.priority || 'M')
      setDue(task.due_date || '')
      setAssignee(task.assigned_to || '')
      setProjectId(task.project_id || '')
      setHours(typeof task.hours_spent === 'number' ? String(task.hours_spent) : '0')
      setBillable(typeof task.billable === 'boolean' ? task.billable : true)
      setRateOverride(typeof task.hourly_rate_override === 'number' ? String(task.hourly_rate_override) : '')
    }
  }, [task])

  if (!open || !task) return null

  function onSave() {
    const next = {
      ...task,
      content: content.trim(),
      priority,
      due_date: due || undefined,
      assigned_to: assignee || undefined,
      project_id: projectId || undefined,
      hours_spent: Number(hours || 0) || 0,
      billable,
      hourly_rate_override: rateOverride ? Number(rateOverride) : undefined,
    }
    onEdit(next)
    setIsEditing(false)
  }

  return (
    <Drawer open={open} onClose={onClose} title="Подробности задачи" widthClassName="w-screen max-w-xl">
      <div className="space-y-4">
        {!isEditing ? (
          <div className="space-y-4">
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
                 <div className="text-xs text-muted-foreground">Часы</div>
                 <div>{typeof task.hours_spent === 'number' ? task.hours_spent : 0}</div>
               </div>
               <div>
                 <div className="text-xs text-muted-foreground">Ставка примененная</div>
                 <div>{typeof task.applied_hourly_rate === 'number' ? `${task.applied_hourly_rate} ₽/ч` : '—'}</div>
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
              <button className="h-8 px-3 rounded border inline-flex items-center justify-center" onClick={() => setIsEditing(true)} title="Редактировать" aria-label="Редактировать">
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
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs mb-1 block">Задача</label>
              <input className="h-9 px-3 rounded border bg-background w-full text-sm" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block">Приоритет</label>
                <Select value={priority} onChange={setPriority} options={[{ value: 'L', label: 'Низкий' }, { value: 'M', label: 'Средний' }, { value: 'H', label: 'Высокий' }]} />
              </div>
              <div>
                <label className="text-xs mb-1 block">Срок</label>
                <DatePicker 
                  date={due ? new Date(due) : undefined} 
                  onDateChange={(newDate) => setDue(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                  placeholder="Срок выполнения"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block">Исполнитель</label>
                <Select value={assignee} onChange={setAssignee} options={[{ value: '', label: 'Не выбран' }, ...employees.map(e => ({ value: e.id, label: e.name }))]} />
              </div>
              <div>
                <label className="text-xs mb-1 block">Проект</label>
                <Select value={projectId} onChange={setProjectId} options={[{ value: '', label: 'Не выбран' }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs mb-1 block">Часы</label>
                <input className="h-9 px-3 rounded border bg-background w-full text-sm" type="number" step="0.25" value={hours} onChange={(e)=>setHours(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1 block">Ставка (руб/час)</label>
                <input className="h-9 px-3 rounded border bg-background w-full text-sm" type="number" value={rateOverride} onChange={(e)=>setRateOverride(e.target.value)} placeholder="Пусто — из сотрудника/проекта" />
              </div>
              <label className="flex items-center gap-2 mt-6 text-sm">
                <input type="checkbox" checked={billable} onChange={(e)=>setBillable(e.target.checked)} /> Биллабельно
              </label>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <button className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground" onClick={onSave}>Сохранить</button>
              <button className="h-8 px-3 rounded border text-sm" onClick={() => { setIsEditing(false); setContent(task.content); setPriority(task.priority); setDue(task.due_date || ''); setAssignee(task.assigned_to || ''); setProjectId(task.project_id || ''); setHours(String(task.hours_spent||0)); setBillable(typeof task.billable==='boolean'?task.billable:true); setRateOverride(typeof task.hourly_rate_override==='number'?String(task.hourly_rate_override):'') }}>Отмена</button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
} 