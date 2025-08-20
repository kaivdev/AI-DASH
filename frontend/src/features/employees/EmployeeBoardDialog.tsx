import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Employee } from '@/types/core'
import { Plus, X, Trash2, ArrowUpRight } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select } from '@/components/Select'

interface EmployeeBoardDialogProps {
  open: boolean
  employees: Employee[]
  onClose: () => void
  onAdd: (e: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => Promise<void> | void
  onRemove: (id: string) => void
  onUpdateStatus: (id: string, status: string, tag?: string) => Promise<void> | void
  isAdmin?: boolean
}

export function EmployeeBoardDialog({ open, employees, onClose, onAdd, onRemove, onUpdateStatus, isAdmin }: EmployeeBoardDialogProps) {
  const [show, setShow] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [salary, setSalary] = useState('')
  const [revenue, setRevenue] = useState('')

  const [query, setQuery] = useState('')
  const [posFilter, setPosFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [statusId, setStatusId] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusTag, setStatusTag] = useState('')

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

  async function onQuickAdd() {
    if (!name.trim() || !position.trim()) return
    await onAdd({
      name: name.trim(),
      position: position.trim(),
      email: email.trim() || undefined,
      salary: salary ? Number(salary) : undefined,
      revenue: revenue ? Number(revenue) : undefined,
      current_status: 'Новый сотрудник',
      status_tag: undefined,
      status_date: new Date().toISOString().slice(0, 10),
      created_at: undefined as any,
      updated_at: undefined as any,
    } as any)
    setName(''); setPosition(''); setEmail(''); setSalary(''); setRevenue('')
  }

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (posFilter && e.position !== posFilter) return false
      if (statusFilter && e.current_status !== statusFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!e.name.toLowerCase().includes(q) && !(e.email||'').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [employees, posFilter, statusFilter, query])

  if (!open && !show) return null

  const positions = Array.from(new Set(employees.map(e => e.position))).filter(Boolean)
  const statuses = Array.from(new Set(employees.map(e => e.current_status))).filter(Boolean)

  const node = (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className={`w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 flex flex-col ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-5 border-b flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold">Сотрудники</h3>
            <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть"><X className="h-4 w-4" /></button>
          </div>

          <div className="p-5 space-y-4 overflow-auto">
            {/* Quick add (admin only) */}
            {isAdmin && (
              <div className="p-3 border rounded bg-muted/10 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-2" placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-2" placeholder="Должность" value={position} onChange={(e) => setPosition(e.target.value)} />
                <input className="h-9 px-3 rounded border bg-background text см md:col-span-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="h-9 px-3 rounded border bg-background text-sm" placeholder="Зарплата" value={salary} onChange={(e) => setSalary(e.target.value)} />
                <input className="h-9 px-3 rounded border bg-background text-sm" placeholder="Доход" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
                <div className="md:col-span-1 flex justify-end">
                  <button className="h-9 px-4 rounded border text-sm bg-primary text-primary-foreground inline-flex items-center gap-2" onClick={onQuickAdd}><Plus className="h-4 w-4" /> Добавить</button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="p-3 border rounded bg-muted/5 grid grid-cols-1 md:grid-cols-5 gap-2">
              <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-2" placeholder="Поиск по имени/email" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Select value={posFilter} onChange={setPosFilter} options={[{value:'',label:'Все должности'},...positions.map(p=>({value:p,label:p}))]} />
              <Select value={statusFilter} onChange={setStatusFilter} options={[{value:'',label:'Все статусы'},...statuses.map(s=>({value:s,label:s}))]} />
            </div>

            <div className="border-t border-dashed" />

            {/* List */}
            <div className="max-h_[60vh] overflow-auto border rounded">
              {filtered.map((e) => (
                <div key={e.id} className="px-3 py-3 border-b last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.position} • {e.email}</div>
                    </div>
                    {isAdmin && (
                      <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={() => { setPendingDeleteId(e.id); setConfirmOpen(true) }} title="Удалить" aria-label="Удалить"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Статус:</span>
                    <span>{e.current_status}</span>
                    {e.status_tag && (<span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">{e.status_tag}</span>)}
                  </div>
                  <div className="mt-2 flex items_center gap-2 text-xs">
                    <input className="h-7 px-2 rounded border bg-background text-xs" placeholder="Новый статус" value={statusId===e.id?newStatus:''} onChange={(ev)=>{setStatusId(e.id); setNewStatus(ev.target.value)}} />
                    <input className="h-7 px-2 rounded border bg-background text-xs w-24" placeholder="Тег" value={statusId===e.id?statusTag:''} onChange={(ev)=>{setStatusId(e.id); setStatusTag(ev.target.value)}} />
                    <button className="h-7 w-7 rounded border inline-flex items-center justify-center" disabled={statusId!==e.id || !newStatus.trim()} onClick={()=> onUpdateStatus(e.id, newStatus.trim(), statusTag.trim()||undefined)} title="Обновить статус" aria-label="Обновить статус"><ArrowUpRight className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (<div className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>)}
            </div>
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={(o)=>{ if(!o){ setConfirmOpen(false); setPendingDeleteId(null) } }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Сотрудник будет удален.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={()=>{ setConfirmOpen(false); setPendingDeleteId(null) }}>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={async ()=>{ if(pendingDeleteId){ try { await onRemove(pendingDeleteId) } catch {} } setConfirmOpen(false); setPendingDeleteId(null) }}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 