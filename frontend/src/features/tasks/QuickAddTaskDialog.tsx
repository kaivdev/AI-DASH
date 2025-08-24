import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTasks } from '@/stores/useTasks'
import { useEmployees } from '@/stores/useEmployees'
import { useProjects } from '@/stores/useProjects'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import { X, Plus } from 'lucide-react'
import { TagCombobox } from '@/components/ui/tag-combobox'
import type { Priority } from '@/types/core'

const priorityOptions = [
  { value: '', label: 'Приоритет' },
  { value: 'L', label: 'Низкий' },
  { value: 'M', label: 'Средний' },
  { value: 'H', label: 'Высокий' }
]

export function QuickAddTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useTasks((s) => s.add)
  const employees = useEmployees((s) => s.employees)
  const projects = useProjects((s) => s.projects)

  const [show, setShow] = useState(false)
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('M')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [costRate, setCostRate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [billable, setBillable] = useState(true)

  // Keep latest onClose in a ref for stable key handler
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Handle mount/open/close side-effects without re-running on every prop change
  useEffect(() => {
    if (open) {
      setShow(true)
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
      document.addEventListener('keydown', onKey)
      return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
    } else {
      const t = setTimeout(() => setShow(false), 180)
      return () => clearTimeout(t)
    }
  }, [open])

  async function onAdd() {
    if (!content.trim()) return
    try {
      await add({
        content: content.trim(),
        description: description.trim() || undefined,
        priority,
        cost_rate_override: costRate ? Number(costRate) : undefined,
        bill_rate_override: hourlyRate ? Number(hourlyRate) : undefined,
        due_date: dueDate || undefined,
        assigned_to: assignedTo || undefined,
        project_id: projectId || undefined,
        tags,
        billable,
        done: false,
        approved: null,
        work_status: 'open',
        hours_spent: estimatedHours ? Number(estimatedHours) : 0
      } as any)
    } finally {
      setContent('')
      setDescription('')
      setPriority('M')
      setEstimatedHours('')
      setHourlyRate('')
      setCostRate('')
      setDueDate('')
      setAssignedTo('')
      setProjectId('')
      setTags([])
      setBillable(true)
      onClose()
    }
  }

  if (!open && !show) return null

  const node = (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className={`w-full max-w-2xl overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 pointer-events-auto ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold">Быстрое добавление задачи</div>
            <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-12">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Название задачи" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
              />
            </div>
            <div className="md:col-span-12">
              <textarea 
                className="min-h-[72px] px-3 py-2 rounded border bg-background text-sm w-full resize-none" 
                placeholder="Описание задачи" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <Select 
                className="w-full" 
                value={priority} 
                onChange={(value) => setPriority(value as Priority)} 
                options={priorityOptions} 
              />
            </div>
            <div className="md:col-span-8">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Часы (план)" 
                type="number" 
                step="0.25"
                value={estimatedHours} 
                onChange={(e) => setEstimatedHours(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Себестоимость сотрудника (₽/ч)" 
                type="number" 
                value={costRate} 
                onChange={(e) => setCostRate(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Тариф для клиента (₽/ч)" 
                type="number" 
                value={hourlyRate} 
                onChange={(e) => setHourlyRate(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <DatePicker 
                date={dueDate ? new Date(dueDate) : undefined} 
                onDateChange={(d) => {
                  if (!d) { setDueDate(''); return }
                  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                  setDueDate(t.toISOString().slice(0,10))
                }} 
                placeholder="Дедлайн" 
              />
            </div>
            <div className="md:col-span-6">
              <Select 
                className="w-full" 
                value={assignedTo} 
                onChange={setAssignedTo} 
                options={[
                  { value: '', label: 'Назначить сотрудника' },
                  ...employees.map(e => ({ value: e.id, label: e.name }))
                ]} 
              />
            </div>
            <div className="md:col-span-6">
              <Select 
                className="w-full" 
                value={projectId} 
                onChange={setProjectId} 
                options={[
                  { value: '', label: 'Выбрать проект' },
                  ...projects.map(p => ({ value: p.id, label: p.name }))
                ]} 
              />
            </div>
            <div className="md:col-span-9">
              <TagCombobox
                value={tags}
                onChange={setTags}
                tagType="task_tag"
                placeholder="Добавьте теги..."
                className="min-h-[36px]"
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <input 
                type="checkbox" 
                id="billable" 
                checked={billable} 
                onChange={(e) => setBillable(e.target.checked)} 
              />
              <label htmlFor="billable" className="text-sm">Оплачиваемая задача</label>
            </div>
            <div className="md:col-span-12 flex items-center justify-end gap-2 pt-1">
              <button className="h-9 px-4 rounded border text-sm" onClick={onClose}>Отмена</button>
              <button className="h-9 px-4 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40" onClick={onAdd}>
                <Plus className="h-4 w-4" /> Добавить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 