import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { useProjects } from '@/stores/useProjects'
import type { Transaction } from '@/types/core'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import { X, Save } from 'lucide-react'

export function QuickEditTransactionDialog({ open, onClose, tx }: { open: boolean; onClose: () => void; tx: Transaction }) {
  const update = useFinance((s) => s.update)
  const employees = useEmployees((s) => s.employees)
  const projects = useProjects((s) => s.projects)

  const [show, setShow] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>(tx.transaction_type)
  const [amount, setAmount] = useState(String(tx.amount ?? ''))
  const [date, setDate] = useState(tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState(tx.category || '')
  const [tags, setTags] = useState(Array.isArray(tx.tags) ? tx.tags.join(', ') : '')
  const [employeeId, setEmployeeId] = useState(tx.employee_id || '')
  const [projectId, setProjectId] = useState(tx.project_id || '')
  const [description, setDescription] = useState(tx.description || '')

  // Keep latest onClose in a ref for stable key handler
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Sync local state when tx changes (e.g., editing another row)
  useEffect(() => {
    setType(tx.transaction_type)
    setAmount(String(tx.amount ?? ''))
    setDate(tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
    setCategory(tx.category || '')
    setTags(Array.isArray(tx.tags) ? tx.tags.join(', ') : '')
    setEmployeeId(tx.employee_id || '')
    setProjectId(tx.project_id || '')
    setDescription(tx.description || '')
  }, [tx])

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

  async function onSave() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    // Build minimal patch: send only changed fields
    const currentDate = (tx.date || '').slice(0, 10)
    const newDate = date || ''
    const norm = (s?: string) => (s || '').trim()
    const origTags = Array.isArray(tx.tags) ? tx.tags : []
    const newTags = tags.split(',').map(t => t.trim()).filter(Boolean)
    const patch: any = {}
    if (tx.amount !== value) patch.amount = value
    if (tx.transaction_type !== type) patch.transaction_type = type
    if (currentDate !== newDate && newDate) patch.date = newDate
    if (norm(tx.category) !== norm(category)) patch.category = category || undefined
    if (norm(tx.description) !== norm(description)) patch.description = description || undefined
    const sameTags = origTags.length === newTags.length && origTags.every((t, i) => t === newTags[i])
    if (!sameTags) patch.tags = newTags
    if ((tx.employee_id || '') !== (employeeId || '')) patch.employee_id = employeeId || undefined
    if ((tx.project_id || '') !== (projectId || '')) patch.project_id = projectId || undefined

    // If nothing to update, just close
    if (Object.keys(patch).length === 0) { onClose(); return }
    await update(tx.id, patch)
    onClose()
  }

  if (!open && !show) return null

  const node = (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className={`w-full max-w-2xl overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 pointer-events-auto ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold">Редактирование транзакции</div>
            <div className="flex items-center gap-2">
              <button className={`h-7 px-2 rounded border text-xs ${type==='income'?'bg-green-500/10':''}`} onClick={()=>setType('income')}>доход</button>
              <button className={`h-7 px-2 rounded border text-xs ${type==='expense'?'bg-red-500/10':''}`} onClick={()=>setType('expense')}>расход</button>
              <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Сумма" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} /></div>
            <div className="md:col-span-3"><DatePicker date={date ? new Date(date) : undefined} onDateChange={(d)=> {
              if (!d) { setDate(''); return }
              const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              setDate(t.toISOString().slice(0,10))
            }} placeholder="Дата" /></div>
            <div className="md:col-span-6"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Категория" value={category} onChange={(e)=>setCategory(e.target.value)} /></div>
            <div className="md:col-span-12"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Описание" value={description} onChange={(e)=>setDescription(e.target.value)} /></div>
            <div className="md:col-span-6"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Теги (через запятую)" value={tags} onChange={(e)=>setTags(e.target.value)} /></div>
            <div className="md:col-span-3"><Select className="w-full" value={employeeId} onChange={setEmployeeId} options={[{value:'',label:'Сотрудник'},...employees.map(e=>({value:e.id,label:e.name}))]} /></div>
            <div className="md:col-span-3"><Select className="w-full" value={projectId} onChange={setProjectId} options={[{value:'',label:'Проект'},...projects.map(p=>({value:p.id,label:p.name}))]} /></div>
            <div className="md:col-span-12 flex items-center justify-end gap-2 pt-1">
              <button className="h-9 px-4 rounded border text-sm" onClick={onClose}>Отмена</button>
              <button className="h-9 px-4 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40" onClick={onSave}><Save className="h-4 w-4" /> Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}

export default QuickEditTransactionDialog
