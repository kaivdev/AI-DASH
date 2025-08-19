import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { useProjects } from '@/stores/useProjects'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import { X, Plus } from 'lucide-react'

export function QuickAddTransactionDialog({ open, onClose, presetType }: { open: boolean; onClose: () => void; presetType: 'income' | 'expense' | null }) {
  const add = useFinance((s) => s.add)
  const employees = useEmployees((s) => s.employees)
  const projects = useProjects((s) => s.projects)

  const [show, setShow] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>(presetType || 'expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')

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

  // Initialize type only when dialog opens
  useEffect(() => {
    if (open) setType(presetType || 'expense')
  }, [open])

  async function onAdd() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    try {
      await add({ amount: value, transaction_type: type, date, category, description, tags: tags.split(',').map(t=>t.trim()).filter(Boolean), employee_id: employeeId || undefined, project_id: projectId || undefined } as any)
    } finally {
      setAmount(''); setCategory(''); setDescription(''); setTags(''); setEmployeeId(''); setProjectId('')
      onClose()
    }
  }

  if (!open && !show) return null

  const node = (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className={`w-full max-w-2xl overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold">Быстрое добавление</div>
            <div className="flex items-center gap-2">
              <button className={`h-7 px-2 rounded border text-xs ${type==='income'?'bg-green-500/10':''}`} onClick={()=>setType('income')}>доход</button>
              <button className={`h-7 px-2 rounded border text-xs ${type==='expense'?'bg-red-500/10':''}`} onClick={()=>setType('expense')}>расход</button>
              <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Сумма" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} /></div>
            <div className="md:col-span-3"><DatePicker date={date ? new Date(date) : undefined} onDateChange={(d)=> setDate(d ? d.toISOString().slice(0,10) : '')} placeholder="Дата" /></div>
            <div className="md:col-span-6"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Категория" value={category} onChange={(e)=>setCategory(e.target.value)} /></div>
            <div className="md:col-span-12"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Описание" value={description} onChange={(e)=>setDescription(e.target.value)} /></div>
            <div className="md:col-span-6"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Теги (через запятую)" value={tags} onChange={(e)=>setTags(e.target.value)} /></div>
            <div className="md:col-span-3"><Select className="w-full" value={employeeId} onChange={setEmployeeId} options={[{value:'',label:'Сотрудник'},...employees.map(e=>({value:e.id,label:e.name}))]} /></div>
            <div className="md:col-span-3"><Select className="w-full" value={projectId} onChange={setProjectId} options={[{value:'',label:'Проект'},...projects.map(p=>({value:p.id,label:p.name}))]} /></div>
            <div className="md:col-span-12 flex items-center justify-end gap-2 pt-1">
              <button className="h-9 px-4 rounded border text-sm" onClick={onClose}>Отмена</button>
              <button className="h-9 px-4 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40" onClick={onAdd}><Plus className="h-4 w-4" /> Добавить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
