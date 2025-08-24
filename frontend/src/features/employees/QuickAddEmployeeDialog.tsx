import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEmployees } from '@/stores/useEmployees'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function QuickAddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useEmployees((s) => s.add)

  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [salary, setSalary] = useState('')
  const [revenue, setRevenue] = useState('')
  const [costHourly, setCostHourly] = useState('')
  const [billHourly, setBillHourly] = useState('')
  const [plannedHours, setPlannedHours] = useState('160')
  const [currentStatus, setCurrentStatus] = useState('Новый сотрудник')

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
    if (!name.trim() || !position.trim()) {
      toast.error('Заполните поля Имя и Должность')
      return
    }
    try {
      await add({
        name: name.trim(),
        position: position.trim(),
        email: email.trim() || undefined,
        salary: salary ? Number(salary) : undefined,
        revenue: revenue ? Number(revenue) : undefined,
        cost_hourly_rate: costHourly ? Number(costHourly) : 0,
        bill_hourly_rate: billHourly ? Number(billHourly) : undefined,
        planned_monthly_hours: plannedHours ? Number(plannedHours) : undefined,
        current_status: currentStatus.trim(),
        status_tag: undefined,
        status_date: new Date().toISOString().slice(0, 10),
      } as any)
    } finally {
      setName('')
      setPosition('')
      setEmail('')
      setSalary('')
      setRevenue('')
      setCostHourly('')
      setBillHourly('')
      setPlannedHours('160')
      setCurrentStatus('Новый сотрудник')
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
            <div className="font-semibold">Быстрое добавление сотрудника</div>
            <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Имя сотрудника *" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
            <div className="md:col-span-6">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Должность *" 
                value={position} 
                onChange={(e) => setPosition(e.target.value)} 
              />
            </div>
            <div className="md:col-span-12">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Email" 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div className="md:col-span-6">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Зарплата (месяц)" 
                type="number" 
                value={salary} 
                onChange={(e) => setSalary(e.target.value)} 
              />
            </div>
            <div className="md:col-span-6">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Доход (месяц)" 
                type="number" 
                value={revenue} 
                onChange={(e) => setRevenue(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Себестоимость/час" 
                type="number" 
                value={costHourly} 
                onChange={(e) => setCostHourly(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Тариф/час" 
                type="number" 
                value={billHourly} 
                onChange={(e) => setBillHourly(e.target.value)} 
              />
            </div>
            <div className="md:col-span-4">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Плановые часы/месяц" 
                type="number" 
                value={plannedHours} 
                onChange={(e) => setPlannedHours(e.target.value)} 
              />
            </div>
            <div className="md:col-span-12">
              <input 
                className="h-9 px-3 rounded border bg-background text-sm w-full" 
                placeholder="Текущий статус" 
                value={currentStatus} 
                onChange={(e) => setCurrentStatus(e.target.value)} 
              />
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