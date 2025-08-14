import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/drawer'
import { Trash2, Pencil, Save, X as CloseIcon, ArrowUpRight } from 'lucide-react'
import type { Employee } from '@/types/core'

interface EmployeeDetailDrawerProps {
  open: boolean
  employee: Employee | null
  onClose: () => void
  onEdit: (id: string, patch: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onUpdateStatus: (id: string, status: string, tag?: string) => void | Promise<void>
}

export function EmployeeDetailDrawer({ open, employee, onClose, onEdit, onDelete, onUpdateStatus }: EmployeeDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [salary, setSalary] = useState('')
  const [revenue, setRevenue] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')

  const [status, setStatus] = useState('')
  const [statusTag, setStatusTag] = useState('')

  useEffect(() => {
    if (employee) {
      setName(employee.name || '')
      setPosition(employee.position || '')
      setEmail(employee.email || '')
      setSalary(typeof employee.salary === 'number' ? String(employee.salary) : '')
      setRevenue(typeof employee.revenue === 'number' ? String(employee.revenue) : '')
      setHourlyRate(typeof (employee as any).hourly_rate === 'number' ? String((employee as any).hourly_rate) : '')
      setStatus(employee.current_status || '')
      setStatusTag(employee.status_tag || '')
      setIsEditing(false)
    }
  }, [employee])

  if (!open || !employee) return null
  const e = employee!

  async function onSave() {
    const patch = {
      name: name.trim(),
      position: position.trim(),
      email: email.trim() || undefined,
      salary: salary ? Number(salary) : undefined,
      revenue: revenue ? Number(revenue) : undefined,
      hourly_rate: hourlyRate ? Number(hourlyRate) : undefined,
    } as Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>
    await onEdit(e.id, patch)
    setIsEditing(false)
  }

  async function onApplyStatus() {
    if (!status.trim()) return
    await onUpdateStatus(e.id, status.trim(), statusTag.trim() || undefined)
  }

  return (
    <Drawer open={open} onClose={onClose} title="Подробности сотрудника" widthClassName="w-screen max-w-xl">
      {!isEditing ? (
        <div className="space-y-4">
          <div>
            <div className="text-xs mb-1 text-muted-foreground">Имя</div>
            <div className="text-sm break-words">{e.name}</div>
          </div>
                     <div className="grid grid-cols-2 gap-3 text-sm">
             <div>
               <div className="text-xs text-muted-foreground">Должность</div>
               <div>{e.position}</div>
             </div>
             <div>
               <div className="text-xs text-muted-foreground">Email</div>
               <div>{e.email || '—'}</div>
             </div>
             <div>
               <div className="text-xs text-muted-foreground">Зарплата</div>
               <div>{typeof e.salary === 'number' ? e.salary : '—'}</div>
             </div>
             <div>
               <div className="text-xs text-muted-foreground">Приносит доходов</div>
               <div>{typeof e.revenue === 'number' ? e.revenue : '—'}</div>
             </div>
             <div>
               <div className="text-xs text-muted-foreground">Почасовая ставка</div>
               <div>{typeof (e as any).hourly_rate === 'number' ? `${(e as any).hourly_rate} ₽/ч` : '—'}</div>
             </div>
             <div>
               <div className="text-xs text-muted-foreground">Создан</div>
               <div>{e.created_at || '—'}</div>
             </div>
             {e.updated_at && (
               <div>
                 <div className="text-xs text-muted-foreground">Обновлен</div>
                 <div>{e.updated_at}</div>
               </div>
             )}
           </div>

          <div className="pt-2 border-t space-y-2">
            <div className="text-xs text-muted-foreground">Статус</div>
            <div className="text-sm">{e.current_status} {e.status_tag && (<span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20 text-xs">{e.status_tag}</span>)}</div>
            <div className="flex items-center gap-2">
              <input className="h-8 px-3 rounded border bg-background text-sm flex-1" placeholder="Новый статус" value={status} onChange={(e)=>setStatus(e.target.value)} />
              <input className="h-8 px-3 rounded border bg-background text-sm w-36" placeholder="Тег" value={statusTag} onChange={(e)=>setStatusTag(e.target.value)} />
              <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onApplyStatus} title="Обновить статус" aria-label="Обновить статус"><ArrowUpRight className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <button className="h-8 px-3 rounded border inline-flex items-center justify-center" onClick={() => setIsEditing(true)} title="Редактировать" aria-label="Редактировать">
              <Pencil className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={() => onDelete(e.id)} title="Удалить" aria-label="Удалить">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs mb-1 block">Имя</label>
            <input className="h-9 px-3 rounded border bg-background w-full text-sm" value={name} onChange={(ev)=>setName(ev.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block">Должность</label>
              <input className="h-9 px-3 rounded border bg-background w-full text-sm" value={position} onChange={(ev)=>setPosition(ev.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block">Email</label>
              <input className="h-9 px-3 rounded border bg-background w-full text-sm" value={email} onChange={(ev)=>setEmail(ev.target.value)} />
            </div>
          </div>
                     <div className="grid grid-cols-3 gap-3">
             <div>
               <label className="text-xs mb-1 block">Зарплата</label>
               <input className="h-9 px-3 rounded border bg-background w-full text-sm" type="number" value={salary} onChange={(ev)=>setSalary(ev.target.value)} />
             </div>
             <div>
               <label className="text-xs mb-1 block">Приносит доходов</label>
               <input className="h-9 px-3 rounded border bg-background w-full text-sm" type="number" value={revenue} onChange={(ev)=>setRevenue(ev.target.value)} />
             </div>
             <div>
               <label className="text-xs mb-1 block">Почасовая ставка (₽/ч)</label>
               <input className="h-9 px-3 rounded border bg-background w-full text-sm" type="number" value={hourlyRate} onChange={(ev)=>setHourlyRate(ev.target.value)} />
             </div>
           </div>
          <div className="flex items-center gap-2 pt-2 border-t">
            <button className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground inline-flex items-center gap-2" onClick={onSave}><Save className="h-4 w-4" /> Сохранить</button>
            <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2" onClick={() => { setIsEditing(false); setName(e.name); setPosition(e.position); setEmail(e.email||''); setSalary(typeof e.salary==='number'?String(e.salary):''); setRevenue(typeof e.revenue==='number'?String(e.revenue):''); }}><CloseIcon className="h-4 w-4" /> Отмена</button>
          </div>
        </div>
      )}
    </Drawer>
  )
} 