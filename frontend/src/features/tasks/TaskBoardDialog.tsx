import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Task, Priority } from '@/types/core'
import { Pencil, CheckSquare, Square, Trash2, X, PlusCircle } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import { Checkbox } from '@/components/ui/checkbox'

interface TaskBoardDialogProps {
  open: boolean
  tasks: Task[]
  employees: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  onClose: () => void
  onOpenDetail: (task: Task) => void
  onStartEdit: (task: Task) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  initialProjectId?: string
  initialStatus?: 'active' | 'done' | 'all'
  isAdmin?: boolean
}

export function TaskBoardDialog({ open, tasks, employees, projects, onClose, onOpenDetail, onStartEdit, onToggle, onDelete, onAdd, initialProjectId, initialStatus, isAdmin }: TaskBoardDialogProps) {
  const [show, setShow] = useState(false)
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState<'all' | Priority>('all')
  const [status, setStatus] = useState<'active' | 'done' | 'all'>(initialStatus ?? 'all')
  const [due, setDue] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | 'nodue'>('all')
  const [assignee, setAssignee] = useState<string>('')
  const [project, setProject] = useState<string>(initialProjectId || '')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Quick add
  const [newContent, setNewContent] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('M')
  const [newDue, setNewDue] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newProject, setNewProject] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  useEffect(() => {
    if (open) {
      setShow(true)
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', onKey)
  return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
    } else {
      const t = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(t)
    }
  }, [open])

     const filtered = useMemo(() => {
    const list = tasks.filter((t) => {
      if (priority !== 'all' && t.priority !== priority) return false
      if (status !== 'all') {
        const needDone = status === 'done'
        if (t.done !== needDone) return false
      }
      if (assignee && t.assigned_to !== assignee) return false
      if (project && t.project_id !== project) return false
      if (due !== 'all') {
        if (due === 'today' && t.due_date !== today) return false
        if (due === 'tomorrow' && t.due_date !== tomorrow) return false
        if (due === 'overdue' && !(t.due_date && t.due_date < today && !t.done)) return false
        if (due === 'nodue' && t.due_date) return false
      }
      if (query) {
        const q = query.toLowerCase()
        if (!t.content.toLowerCase().includes(q)) return false
      }
      return true
    })
    const pw: any = { H: 3, M: 2, L: 1 }
    return list.sort((a,b)=> (pw[b.priority]-pw[a.priority]) || (a.due_date||'').localeCompare(b.due_date||''))
  }, [tasks, priority, status, assignee, project, due, query, today, tomorrow])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onBulkToggle() {
    const ids = Array.from(selected)
    await Promise.all(ids.map((id) => Promise.resolve(onToggle(id))))
    setSelected(new Set())
  }

  async function onBulkDelete() {
    const ids = Array.from(selected)
    await Promise.all(ids.map((id) => Promise.resolve(onDelete(id))))
    setSelected(new Set())
  }

  async function onQuickAdd() {
    if (!isAdmin) return
    if (!newContent.trim()) return
    await onAdd({
      content: newContent.trim(),
      priority: newPriority,
      due_date: newDue || undefined,
      done: false,
      assigned_to: newAssignee || undefined,
      project_id: newProject || undefined,
      created_at: undefined as any,
      updated_at: undefined as any,
    } as any)
    setNewContent('')
    setNewPriority('M')
    setNewDue('')
    setNewAssignee('')
    setNewProject('')
  }

  if (!open && !show) return null

  const node = (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className={`w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 flex flex-col pointer-events-auto ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-5 border-b flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold">Задачи</h3>
            <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-auto">
            {/* Quick add block (admin only) */}
            {isAdmin && (
            <div className="p-3 border rounded bg-muted/10">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <input
                  className="h-9 px-3 rounded border bg-background text-sm md:col-span-3 md:row-start-1 md:col-start-1"
                  placeholder="Быстро добавить задачу"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <div className="md:col-span-1 md:row-start-1 md:col-start-4">
                  <Select value={newPriority} onChange={(v)=>setNewPriority(v as Priority)} options={[{value:'L',label:'Низкий'},{value:'M',label:'Средний'},{value:'H',label:'Высокий'}]} />
                </div>
                <div className="md:col-span-1 md:row-start-1 md:col-start-5">
                  <DatePicker 
                    date={newDue ? new Date(newDue) : undefined} 
                    onDateChange={(newDate) => setNewDue(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                    placeholder="Срок"
                  />
                </div>
                <div className="md:col-span-1 md:row-start-1 md:col-start-6 flex justify-end">
                  <button
                    className="h-9 px-4 rounded border text-sm bg-primary text-primary-foreground w-full md:w-auto inline-flex items-center gap-2"
                    onClick={onQuickAdd}
                  >
                    <PlusCircle className="h-4 w-4" /> Добавить
                  </button>
                </div>

                <div className="md:col-span-3 md:row-start-2 md:col-start-1">
                  <Select value={newAssignee} onChange={setNewAssignee} options={[{value:'',label:'Исполнитель'},...employees.map(e=>({value:e.id,label:e.name}))]} />
                </div>
                <div className="md:col-span-3 md:row-start-2 md:col-start-4">
                  <Select value={newProject} onChange={setNewProject} options={[{value:'',label:'Проект'},...projects.map(p=>({value:p.id,label:p.name}))]} />
                </div>
              </div>
            </div>
            )}

            {/* Filters block */}
            <div className="p-3 border rounded bg-muted/5">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-2" placeholder="Поиск" value={query} onChange={(e) => setQuery(e.target.value)} />
                <Select value={priority} onChange={(v)=>setPriority(v as any)} options={[{value:'all',label:'Все приоритеты'},{value:'L',label:'Низкий'},{value:'M',label:'Средний'},{value:'H',label:'Высокий'}]} />
                <Select value={status} onChange={(v)=>setStatus(v as any)} options={[{value:'all',label:'Все статусы'},{value:'active',label:'Активные'},{value:'done',label:'Выполненные'}]} />
                <Select value={due} onChange={(v)=>setDue(v as any)} options={[{value:'all',label:'Все сроки'},{value:'today',label:'Сегодня'},{value:'tomorrow',label:'Завтра'},{value:'overdue',label:'Просроченные'},{value:'nodue',label:'Без срока'}]} />
                <Select value={assignee} onChange={setAssignee} options={[{value:'',label:'Все исполнители'},...employees.map(e=>({value:e.id,label:e.name}))]} />
                <Select value={project} onChange={setProject} options={[{value:'',label:'Все проекты'},...projects.map(p=>({value:p.id,label:p.name}))]} />
              </div>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Найдено: {filtered.length}</div>
              <div className="flex items-center gap-2">
                <button className="h-8 px-3 rounded border text-xs inline-flex items-center gap-2" disabled={selected.size === 0} onClick={onBulkToggle}>
                  <CheckSquare className="h-4 w-4" /> Отметить/снять
                </button>
                <button className="h-8 px-3 rounded border text-xs bg-red-600 border-red-600 text-primary-foreground inline-flex items-center gap-2" disabled={selected.size === 0} onClick={onBulkDelete}>
                  <Trash2 className="h-4 w-4" /> Удалить выбранные
                </button>
              </div>
            </div>

            <div className="border-t border-dashed" />

            {/* List */}
            <div className="max-h-[60vh] overflow-auto border rounded">
              {filtered.map((t) => (
                                  <div key={t.id} className={`px-3 py-2 border-b last:border-b-0 flex items-start gap-2 ${t.done ? 'opacity-60' : ''}`}>
                    <Checkbox className="mt-0.5" checked={selected.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <button className={`text-left ${t.done ? 'line-through text-muted-foreground' : ''}`} onClick={() => onOpenDetail(t)}>{t.content}</button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {t.due_date && <span>{t.due_date}</span>}
                          {t.priority && <span className="px-2 py-0.5 rounded bg-muted">{t.priority}</span>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                        {t.assigned_to && <span>👤 {employees.find(e => e.id === t.assigned_to)?.name}</span>}
                        {t.project_id && <span>📁 {projects.find(p => p.id === t.project_id)?.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={() => onStartEdit(t)} title="Редактировать" aria-label="Редактировать">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={() => onToggle(t.id)} title={t.done ? 'Снять' : 'Готово'} aria-label={t.done ? 'Снять' : 'Готово'}>
                        {t.done ? <Square className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
                      </button>
                      <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={() => onDelete(t.id)} title="Удалить" aria-label="Удалить">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 