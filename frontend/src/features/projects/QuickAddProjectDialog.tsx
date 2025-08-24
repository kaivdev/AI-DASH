import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useProjects } from '@/stores/useProjects'
import { useEmployees } from '@/stores/useEmployees'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import { X, Plus } from 'lucide-react'
import { TagCombobox } from '@/components/ui/tag-combobox'

const statusOptions = [
  { value: 'active', label: 'Активный' },
  { value: 'on_hold', label: 'Приостановлен' },
  { value: 'completed', label: 'Завершен' }
]

export function QuickAddProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useProjects((s) => s.add)
  const employees = useEmployees((s) => s.employees)

  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [memberIds, setMemberIds] = useState<string[]>([])

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
    if (!name.trim()) return
    try {
      await add({
        name: name.trim(),
        description: description.trim() || undefined,
        status: status as any,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: budget ? Number(budget) : undefined,
        tags,
        member_ids: memberIds,
        links: []
      } as any)
    } finally {
      setName('')
      setDescription('')
      setStatus('active')
      setStartDate('')
      setEndDate('')
      setBudget('')
      setTags([])
      setMemberIds([])
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
            <div className="font-semibold">Быстрое добавление проекта</div>
            <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-8">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Название проекта" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <Select 
                className="w-full" 
                value={status} 
                onChange={setStatus} 
                options={statusOptions} 
              />
            </div>
            <div className="md:col-span-12">
              <textarea 
                className="min-h-[72px] px-3 py-2 rounded border bg-background text-sm w-full resize-none" 
                placeholder="Описание проекта" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <DatePicker 
                date={startDate ? new Date(startDate) : undefined} 
                onDateChange={(d) => {
                  if (!d) { setStartDate(''); return }
                  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                  setStartDate(t.toISOString().slice(0,10))
                }} 
                placeholder="Дата начала" 
              />
            </div>
            <div className="md:col-span-4">
              <DatePicker 
                date={endDate ? new Date(endDate) : undefined} 
                onDateChange={(d) => {
                  if (!d) { setEndDate(''); return }
                  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                  setEndDate(t.toISOString().slice(0,10))
                }} 
                placeholder="Дата окончания" 
              />
            </div>
            <div className="md:col-span-4">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Бюджет" 
                type="number" 
                value={budget} 
                onChange={(e) => setBudget(e.target.value)} 
              />
            </div>
            <div className="md:col-span-12">
              <TagCombobox
                value={tags}
                onChange={setTags}
                tagType="project_tag"
                placeholder="Добавьте теги..."
                className="min-h-[36px]"
              />
            </div>
            <div className="md:col-span-12">
              <Select 
                className="w-full" 
                value="" 
                onChange={(empId) => {
                  if (empId && !memberIds.includes(empId)) {
                    setMemberIds([...memberIds, empId])
                  }
                }} 
                options={[
                  { value: '', label: 'Добавить участника' },
                  ...employees
                    .filter(e => !memberIds.includes(e.id))
                    .map(e => ({ value: e.id, label: e.name }))
                ]} 
              />
            </div>
            {memberIds.length > 0 && (
              <div className="md:col-span-12">
                <div className="flex flex-wrap gap-2">
                  {memberIds.map(id => {
                    const emp = employees.find(e => e.id === id)
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                        {emp?.name || id}
                        <button 
                          onClick={() => setMemberIds(memberIds.filter(mid => mid !== id))}
                          className="ml-1 h-4 w-4 rounded bg-muted-foreground/20 hover:bg-muted-foreground/40 inline-flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
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