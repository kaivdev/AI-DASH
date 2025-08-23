import { ModuleCard } from '@/features/modules/ModuleCard'
import { useEmployees } from '@/stores/useEmployees'
import { formatCurrency } from '@/lib/format'
import { useEffect, useMemo, useState } from 'react'
import { EmployeeBoardDialog } from './EmployeeBoardDialog'
import { Plus, X, Trash2, ArrowUpRight } from 'lucide-react'
import { EmployeeDetailDrawer } from './EmployeeDetailDrawer'
import { useAuth } from '@/stores/useAuth'
import { TagCombobox } from '@/components/ui/tag-combobox'
import { EmptyState } from '@/components/ui/empty-state'
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

export function EmployeesCard() {
  const employees = useEmployees((s) => s.employees)
  const add = useEmployees((s) => s.add)
  const update = useEmployees((s) => s.update)
  const updateStatus = useEmployees((s) => s.updateStatus)
  const remove = useEmployees((s) => s.remove)
  const fetchEmployees = useEmployees((s) => s.fetchEmployees)

  const user = useAuth((s) => s.user)
  const isAdmin = (user?.role === 'owner' || user?.role === 'admin')

  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [salary, setSalary] = useState('')
  const [revenue, setRevenue] = useState('')
  const [costHourly, setCostHourly] = useState('')
  const [billHourly, setBillHourly] = useState('')
  const [plannedHours, setPlannedHours] = useState('160')

  const [statusId, setStatusId] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusTag, setStatusTag] = useState('')

  const [boardOpen, setBoardOpen] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    function onTitleClick(e: any) {
      if (e?.detail?.id === 'employees') setBoardOpen(true)
    }
    window.addEventListener('module-title-click', onTitleClick as any)
    return () => window.removeEventListener('module-title-click', onTitleClick as any)
  }, [])

  async function onAdd() {
    if (!name.trim() || !position.trim()) return
    await add({
      name: name.trim(),
      position: position.trim(),
      email: email.trim() || undefined,
      salary: salary ? Number(salary) : undefined,
      revenue: revenue ? Number(revenue) : undefined,
      cost_hourly_rate: costHourly ? Number(costHourly) : 0,
      bill_hourly_rate: billHourly ? Number(billHourly) : undefined,
  planned_monthly_hours: plannedHours ? Number(plannedHours) : undefined,
      current_status: 'Новый сотрудник',
      status_tag: undefined,
      status_date: new Date().toISOString().slice(0, 10),
    } as any)
    setName('')
    setPosition('')
    setEmail('')
    setSalary('')
    setRevenue('')
    setCostHourly('')
    setBillHourly('')
    setPlannedHours('160')
    setShowAddForm(false)
  }

  async function onUpdateStatus() {
    if (!statusId || !newStatus.trim()) return
    await updateStatus(statusId, newStatus.trim(), statusTag.trim() || undefined)
    setStatusId('')
    setNewStatus('')
    setStatusTag('')
  }

  const detailEmployee = detailEmployeeId ? employees.find(e => e.id === detailEmployeeId) || null : null
  const orderedEmployees = useMemo(() => {
    return employees.slice().sort((a, b) => {
      const ta = new Date(a.created_at || '').getTime() || 0
      const tb = new Date(b.created_at || '').getTime() || 0
      return tb - ta // newest first
    })
  }, [employees])

  return (
    <ModuleCard
      id="employees"
      title="Сотрудники"
      size="2x2"
      headerActions={
        isAdmin && (
          <button
            className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40"
            onClick={() => {
              const next = !showAddForm
              setShowAddForm(next)
              if (next) {
                setTimeout(() => {
                  try {
                    const card = document.querySelector('[data-module-id="employees"]') as HTMLElement | null
                    const vp = card?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
                    if (vp) vp.scrollTo({ top: 0, behavior: 'smooth' })
                    const input = card?.querySelector('input[placeholder="Иван Иванов"]') as HTMLInputElement | null
                    if (input) input.focus()
                  } catch {}
                }, 0)
              }
            }}
          >
            {showAddForm ? (<><X className="h-4 w-4" /> Отмена</>) : (<><Plus className="h-4 w-4" /> Добавить</>)}
          </button>
        )
      }
    >
      <EmployeeBoardDialog
        open={boardOpen}
        employees={employees}
        onClose={() => setBoardOpen(false)}
        onAdd={(e) => { if (isAdmin) return add(e as any) as any; return Promise.resolve() }}
        onRemove={(id) => { if (isAdmin) remove(id) }}
        onUpdateStatus={(id, s, t) => updateStatus(id, s, t)}
        isAdmin={isAdmin}
      />

      <EmployeeDetailDrawer
        open={detailOpen}
        employee={detailEmployee}
        onClose={() => setDetailOpen(false)}
        onEdit={async (id, patch) => { try { await update(id, patch) } catch {} }}
        onDelete={async (id) => { if (!isAdmin) return; setPendingDeleteId(id); setConfirmOpen(true) }}
        onUpdateStatus={async (id, s, t) => { try { await updateStatus(id, s, t) } catch {} }}
  isAdmin={isAdmin}
      />

      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="text-sm text-muted-foreground">Всего: {employees.length}</div>

        {isAdmin && showAddForm && (
          <div className="p-3 border rounded bg-muted/10">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs mb-1 block">Имя *</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="Иван Иванов"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Должность *</label>
                <TagCombobox
                  value={position ? [position] : []}
                  onChange={(values) => setPosition(values[0] || '')}
                  tagType="position"
                  placeholder="Выберите должность..."
                  className="min-h-[32px]"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Email</label>
                <input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="ivan@company.com"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Зарплата</label>
                <input 
                  type="number"
                  value={salary} 
                  onChange={(e) => setSalary(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="100000"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Приносит доходов</label>
                <input 
                  type="number"
                  value={revenue} 
                  onChange={(e) => setRevenue(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="150000"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Себестоимость часа (₽/ч)</label>
                <input 
                  type="number"
                  value={costHourly} 
                  onChange={(e) => setCostHourly(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="Напр. 800"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Биллинговая ставка (₽/ч)</label>
                <input 
                  type="number"
                  value={billHourly} 
                  onChange={(e) => setBillHourly(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="Напр. 1200"
                />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs mb-1 block">План часов/мес</label>
                  <input type="number" value={plannedHours} onChange={(e)=>setPlannedHours(e.target.value)} className="h-8 px-3 rounded border bg-background w-full text-sm" placeholder="160" />
                </div>
                <div className="col-span-2 flex items-end">
                  <button className="h-8 px-3 rounded border text-sm" type="button" onClick={() => { const sal = Number(salary||0); const hrs = Math.max(1, Number(plannedHours||160)); if (sal>0 && hrs>0) setCostHourly(String(Math.round(sal/hrs))) }}>Рассчитать себестоимость из зарплаты</button>
                </div>
              </div>
            </div>
            <button 
              className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground inline-flex items-center gap-2"
              onClick={onAdd}
            >
              <Plus className="h-4 w-4" /> Добавить сотрудника
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-2">
            {orderedEmployees.length === 0 && (
              <EmptyState
                title="Нет данных"
                description="Добавьте своего первого сотрудника, чтобы начать управление командой и проектами"
                actions={[
                  {
                    label: '+ Добавить сотрудника',
                    onClick: () => setShowAddForm(true),
                    variant: 'default'
                  }
                ]}
              />
            )}
            {orderedEmployees.map((emp) => (
              <div key={emp.id} className="p-3 border rounded">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <button className="font-medium text-left" onClick={() => { setDetailEmployeeId(emp.id); setDetailOpen(true) }}>{emp.name}</button>
                    <div className="text-sm text-muted-foreground">{emp.position}</div>
                    {emp.email && (
                      <div className="text-xs text-muted-foreground">{emp.email}</div>
                    )}
                  </div>
                  {isAdmin && (
                    <button 
                      className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                      onClick={() => { setPendingDeleteId(emp.id); setConfirmOpen(true) }}
                      title="Удалить" aria-label="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                <div className="text_sm mb-2">
                  <div className="flex items-center gap-4">
                    {typeof emp.salary === 'number' && (
                      <span>💰 {formatCurrency(emp.salary, 'RUB')}</span>
                    )}
                    {typeof emp.revenue === 'number' && (
                      <span className="text-green-600 dark:text-green-300">📈 {formatCurrency(emp.revenue, 'RUB')}</span>
                    )}
                  </div>
                </div>

                {/* Info bar: cost/bill rates and planned hours (hide rates for non-admins) */}
                <div className="text-xs mb-2 inline-flex flex-wrap items-center gap-2">
                  {isAdmin && (<span className="px-1.5 py-0.5 rounded bg-muted">Себест.: {typeof (emp as any).cost_hourly_rate === 'number' ? `${(emp as any).cost_hourly_rate} ₽/ч` : '—'}</span>)}
                  {isAdmin && (<span className="px-1.5 py-0.5 rounded bg-muted">Биллинг: {typeof (emp as any).bill_hourly_rate === 'number' ? `${(emp as any).bill_hourly_rate} ₽/ч` : '—'}</span>)}
                  <span className="px-1.5 py-0.5 rounded bg-muted">План: {typeof (emp as any).planned_monthly_hours === 'number' ? (emp as any).planned_monthly_hours : 160} ч/мес</span>
                </div>

                <div className="text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Статус:</span>
                    <span>{emp.current_status}</span>
                    {emp.status_tag && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20 rounded text-xs">
                        {emp.status_tag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {emp.status_date}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    value={statusId === emp.id ? newStatus : ''} 
                    onChange={(e) => {
                      setStatusId(emp.id)
                      setNewStatus(e.target.value)
                    }}
                    className="h-7 px-2 rounded border bg-background text-xs flex-1"
                    placeholder="Новый статус..."
                  />
                  <input 
                    value={statusId === emp.id ? statusTag : ''} 
                    onChange={(e) => {
                      setStatusId(emp.id)
                      setStatusTag(e.target.value)
                    }}
                    className="h-7 px-2 rounded border bg-background text-xs w-20"
                    placeholder="Тег"
                  />
                  <button 
                    className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                    onClick={onUpdateStatus}
                    disabled={statusId !== emp.id || !newStatus.trim()}
                    title="Обновить статус" aria-label="Обновить статус"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Inline quick edit for rates (admin only) */}
                {isAdmin && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ставки:</span>
                    <input
                      id={`erc-${emp.id}`}
                      type="number"
                      className="h-7 px-2 rounded border bg-background w-24"
                      placeholder="Себест. ₽/ч"
                      defaultValue={typeof (emp as any).cost_hourly_rate === 'number' ? String((emp as any).cost_hourly_rate) : ''}
                    />
                    <input
                      id={`erb-${emp.id}`}
                      type="number"
                      className="h-7 px-2 rounded border bg-background w-24"
                      placeholder="Биллинг ₽/ч"
                      defaultValue={typeof (emp as any).bill_hourly_rate === 'number' ? String((emp as any).bill_hourly_rate) : ''}
                    />
                    <button
                      className="h-7 px-2 rounded border"
                      onClick={async () => {
                        const ec = document.getElementById(`erc-${emp.id}`) as HTMLInputElement | null
                        const eb = document.getElementById(`erb-${emp.id}`) as HTMLInputElement | null
                        const vc = ec?.value?.trim()
                        const vb = eb?.value?.trim()
                        try {
                          await update(emp.id, {
                            cost_hourly_rate: vc ? Number(vc) : null,
                            bill_hourly_rate: vb ? Number(vb) : null,
                          } as any)
                        } catch {}
                      }}
                    >
                      Применить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
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
            <AlertDialogAction onClick={async ()=>{ if(pendingDeleteId){ try { await remove(pendingDeleteId) } catch {} } setConfirmOpen(false); setPendingDeleteId(null); setDetailOpen(false) }}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleCard>
  )
}