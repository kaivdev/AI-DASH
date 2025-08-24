import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { useProjects } from '@/stores/useProjects'
import { useTasks } from '@/stores/useTasks'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import { X, Plus, Trash2, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { Checkbox } from '@/components/ui/checkbox'
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, AreaChart, Area } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import TransactionsDataTable, { TransactionsDataTableHandle } from './TransactionsDataTable'

export function FinanceBoardDialog({ open, onClose, presetType }: { open: boolean; onClose: () => void; presetType: 'income' | 'expense' | null }) {
  const [show, setShow] = useState(false)
  const txs = useFinance((s) => s.txs)
  const add = useFinance((s) => s.add)
  const remove = useFinance((s) => s.remove)
  const employees = useEmployees((s) => s.employees)
  const projects = useProjects((s) => s.projects)
  const tasks = useTasks((s) => s.tasks)
  const formerEmployees = useEmployees((s) => s.formerEmployees)

  // quick add form
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [hours, setHours] = useState('')

  // filters: переносим в таблицу, оставляем только период пресетов
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [chartMode, setChartMode] = useState<'days' | 'months'>('days')

  // selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const tableRef = useRef<TransactionsDataTableHandle | null>(null)
  function selectAll(ids: string[]) { setSelected(new Set(ids)) }
  function clearSelection() { setSelected(new Set()); tableRef.current?.clearSelection() }

  // Stable callbacks for child props to avoid re-creating table/columns every render
  const handleDeleteTx = useMemo(() => (id: string) => remove(id), [remove])
  const handleSelectionChange = useMemo(() => (ids: string[]) => setSelected(new Set(ids)), [])

  // Add period presets state
  const [preset, setPreset] = useState<'7'|'30'|'90'|'all'>('30')

  // Apply preset to date filters
  useEffect(() => {
    const today = new Date()
    // local ISO date without UTC shift, e.g. 'YYYY-MM-DD'
    const toLocalISO = (d: Date) => {
      const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      return t.toISOString().slice(0, 10)
    }
    if (preset === 'all') { setDateFrom(''); setDateTo(''); return }
    const n = preset==='7'?7:preset==='30'?30:90
    const start = new Date(today); start.setDate(today.getDate() - (n-1))
    setDateFrom(toLocalISO(start)); setDateTo(toLocalISO(today))
  }, [preset])

  // When switching to 'Все', show месяцы автоматически
  useEffect(() => {
    if (preset === 'all') setChartMode('months')
  }, [preset])

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (open) {
      setShow(true)
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
      document.addEventListener('keydown', onKey)
      return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
    } else {
      const t = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // apply presetType only when dialog opens, not on every re-render
  useEffect(() => {
    if (open && presetType) setType(presetType)
  }, [open])

  // Map task_id -> hours for hour-based filters
  const hoursByTask = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks) m.set(t.id, typeof t.hours_spent === 'number' ? t.hours_spent : 0)
    return m
  }, [tasks])

  const filtered = useMemo(() => {
    // Оставляем только ограничение по периоду; остальное фильтрует таблица
    return txs.filter((t) => {
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [txs, dateFrom, dateTo])

  // charts
  const { lineData, chartLabel } = useMemo(() => {
    const txList = filtered // использовать уже ограниченный периодом список
    const toLocalISO = (d: Date) => {
      const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      return t.toISOString().slice(0, 10)
    }

    if (chartMode === 'days') {
      // Строим диапазон по dateFrom/dateTo, если заданы, иначе последние 7 дней, сегодня справа
      let start: string
      let end: string
      if (dateFrom && dateTo) { start = dateFrom; end = dateTo }
      else {
        const today = new Date()
        const s = new Date(today); s.setDate(today.getDate() - 6)
        start = toLocalISO(s); end = toLocalISO(today)
      }
      // Сгенерировать список дней включительно
      const range: string[] = []
      const [sy, sm, sd] = start.split('-').map(Number)
      const [ey, em, ed] = end.split('-').map(Number)
      const cur = new Date(sy!, (sm! - 1), sd!)
      const last = new Date(ey!, (em! - 1), ed!)
      while (cur <= last) {
        range.push(toLocalISO(cur))
        cur.setDate(cur.getDate() + 1)
      }
      const daySum = new Map<string, { income: number; expense: number }>()
      for (const day of range) daySum.set(day, { income: 0, expense: 0 })
      for (const t of txList) {
        if (!daySum.has(t.date)) continue
        const row = daySum.get(t.date)!
        if ((t as any).transaction_type === 'income') row.income += t.amount
        else row.expense += t.amount
        daySum.set(t.date, row)
      }
      return { lineData: range.map((day) => ({ date: day, ...daySum.get(day)! })), chartLabel: `${range.length} дн.` }
    }

    // months mode: по месяцам в пределах dateFrom/dateTo или весь период до текущего месяца
    const rangeM: string[] = []
    if (dateFrom && dateTo) {
      const [sy, sm] = dateFrom.split('-').map(Number)
      const [ey, em] = dateTo.split('-').map(Number)
      let y = sy!, m = sm!
      while (y < ey! || (y === ey! && m <= em!)) {
        rangeM.push(`${y}-${String(m).padStart(2, '0')}`)
        m++; if (m > 12) { m = 1; y++ }
      }
    } else {
      // preset 'all': от самого раннего месяца транзакций до текущего месяца (сегодня справа)
      let minYm: string | null = null
      for (const t of txs) {
        const ym = t.date.slice(0, 7)
        if (!minYm || ym < minYm) minYm = ym
      }
      const now = new Date()
      const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      if (!minYm) {
        // если нет транзакций, показать последние 6 месяцев до текущего
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          rangeM.push(ym)
        }
      } else {
        const [sy, sm] = minYm.split('-').map(Number)
        let y = sy!, m = sm!
        while (true) {
          const ym = `${y}-${String(m).padStart(2, '0')}`
          rangeM.push(ym)
          if (ym === currentYm) break
          m++; if (m > 12) { m = 1; y++ }
        }
      }
    }
    const sumM = new Map<string, { income: number; expense: number }>()
    for (const m of rangeM) sumM.set(m, { income: 0, expense: 0 })
    for (const t of txList) {
      const m = t.date.slice(0, 7)
      if (!sumM.has(m)) continue
      const row = sumM.get(m)!
      if ((t as any).transaction_type === 'income') row.income += t.amount
      else row.expense += t.amount
      sumM.set(m, row)
    }
    return { lineData: rangeM.map((m) => ({ date: m, ...sumM.get(m)! })), chartLabel: `${rangeM.length} мес.` }
  }, [filtered, chartMode, dateFrom, dateTo])

  // Hours table: aggregate task hours by project and employee (global or filtered by date range if possible)
  const hoursTable = useMemo(() => {
    // Limit by dateFrom/dateTo using task.updated_at when present
    const inRange = (d?: string) => {
      if (!d) return true
      const ds = d.slice(0,10)
      if (dateFrom && ds < dateFrom) return false
      if (dateTo && ds > dateTo) return false
      return true
    }
    const map = new Map<string, Map<string, number>>() // projectId -> (employeeId -> hours)
    for (const t of tasks) {
      if (!inRange(t.updated_at || t.created_at)) continue
      const pid = t.project_id || '—'
      const eid = t.assigned_to || '—'
      const h = typeof t.hours_spent === 'number' ? t.hours_spent : 0
      if (!map.has(pid)) map.set(pid, new Map())
      const inner = map.get(pid)!
      inner.set(eid, (inner.get(eid) || 0) + h)
    }
    // Build rows
    const rows: { projectId: string; projectName: string; employeeId: string; employeeName: string; hours: number }[] = []
    for (const [pid, inner] of map) {
      for (const [eid, hours] of inner) {
        const projectName = pid === '—' ? 'Без проекта' : (projects.find(p=>p.id===pid)?.name || pid)
        let employeeName: string
        if (eid === '—') employeeName = 'Не назначен'
        else {
          const found = employees.find(e=>e.id===eid)?.name
          const archived = formerEmployees?.[eid]
          employeeName = found || (archived ? `${archived} (уволен)` : eid)
        }
        rows.push({ projectId: pid, projectName, employeeId: eid, employeeName, hours })
      }
    }
    // sort by project then hours desc
    rows.sort((a,b)=> a.projectName.localeCompare(b.projectName) || b.hours - a.hours)
    return rows
  }, [tasks, projects, employees, formerEmployees, dateFrom, dateTo])

  // stats + per-project summary
  const stats = useMemo(() => {
    const expenses = filtered.filter(t => (t as any).transaction_type === 'expense')
    const income = filtered.filter(t => (t as any).transaction_type === 'income')
    const sum = (arr: typeof filtered) => arr.reduce((s,t)=> s + t.amount, 0)
    const expSum = sum(expenses)
    const incSum = sum(income)
    // top-3 categories by expense
    const catMap = new Map<string, number>()
    for (const t of expenses) catMap.set(t.category || '—', (catMap.get(t.category || '—') || 0) + t.amount)
    const top3 = Array.from(catMap.entries()).sort((a,b)=> b[1]-a[1]).slice(0,3)
    // avg per day (by dates present in filtered)
    const daySet = new Set(filtered.map(t => t.date))
    const days = Math.max(1, daySet.size)
    // per project
    const byProject = new Map<string, { income: number; expense: number }>()
    for (const t of filtered) {
      const pid = ((t as any).project_id || '—') as string
      const row = byProject.get(pid) || { income: 0, expense: 0 }
      if ((t as any).transaction_type === 'income') row.income += t.amount
      else row.expense += t.amount
      byProject.set(pid, row)
    }
    return { expSum, incSum, top3, avgExpense: expSum / days, avgIncome: incSum / days, byProject }
  }, [filtered])

  function onAdd() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    add({ amount: value, transaction_type: type, date, category, description, tags: tags.split(',').map(t=>t.trim()).filter(Boolean), employee_id: employeeId || undefined, project_id: projectId || undefined } as any)
  setAmount(''); setCategory(''); setDescription(''); setTags(''); setEmployeeId(''); setProjectId(''); setHours('')
  }

  function exportCSV() {
    // Build a full CSV with all known transaction fields and a UTF-8 BOM for Excel compatibility
    const header = [
      'id',
      'date',
      'type',
      'amount',
      'category',
      'description',
      'tags',
      'employee_id',
      'employee',
      'project_id',
      'project',
      'task_id',
      'created_at',
      'updated_at',
    ]
    const rows = filtered.map((t) => {
      const employeeId = (t as any).employee_id || ''
      const projectId = (t as any).project_id || ''
      const employee = employeeId ? employees.find(e => e.id === employeeId)?.name || '' : ''
      const project = projectId ? projects.find(p => p.id === projectId)?.name || '' : ''
      const tagsArray = Array.isArray((t as any).tags) ? (t as any).tags : []
      return [
        t.id,
        t.date,
        (t as any).transaction_type,
        String(t.amount),
        t.category || '',
        t.description || '',
        tagsArray.join('|'),
        employeeId,
        employee,
        projectId,
        project,
        (t as any).task_id || '',
        (t as any).created_at || '',
        (t as any).updated_at || '',
      ]
    })
  const escapeCSV = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`
  // Use CRLF for Windows-friendly newlines
  const csvBody = [header, ...rows].map(r => r.map(escapeCSV).join(',')).join('\r\n')
  // Hint Excel to use comma as a separator on RU locales
  const sepDirective = 'sep=,\r\n'
  const content = sepDirective + csvBody
  // Encode as UTF-16LE with BOM for stable Cyrillic decoding in Excel
  const u16 = new Uint16Array(content.length + 1)
  u16[0] = 0xFEFF
  for (let i = 0; i < content.length; i++) u16[i + 1] = content.charCodeAt(i)
  const blob = new Blob([u16], { type: 'text/csv;charset=utf-16le;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportXLSX() {
    const header = [
      'id','date','type','amount','category','description','tags','employee_id','employee','project_id','project','task_id','created_at','updated_at'
    ] as const
    const rows = filtered.map((t) => {
      const employeeId = (t as any).employee_id || ''
      const projectId = (t as any).project_id || ''
      const employee = employeeId ? employees.find(e => e.id === employeeId)?.name || '' : ''
      const project = projectId ? projects.find(p => p.id === projectId)?.name || '' : ''
      const tagsArray = Array.isArray((t as any).tags) ? (t as any).tags : []
      return {
        id: t.id,
        date: t.date,
        type: (t as any).transaction_type,
        amount: t.amount,
        category: t.category || '',
        description: t.description || '',
        tags: tagsArray.join('|'),
        employee_id: employeeId,
        employee,
        project_id: projectId,
        project,
        task_id: (t as any).task_id || '',
        created_at: (t as any).created_at || '',
        updated_at: (t as any).updated_at || '',
      }
    })
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows, { header: [...header] as any })
    // Auto width per column based on content length (capped)
    const maxLen = (k: keyof typeof rows[number]) => Math.min(60, Math.max(String(k).length, ...rows.map(r => String((r as any)[k] ?? '').length)))
    ws['!cols'] = (header as unknown as string[]).map(k => ({ wch: maxLen(k as any) + 2 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Finance')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance_${new Date().toISOString().slice(0,10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function bulkDelete() {
    const ids = Array.from(selected)
    for (const id of ids) remove(id)
    clearSelection()
  }

  if (!open && !show) return null

  const node = (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 flex flex-col pointer-events-auto ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-5 border-b flex items-center justify-between gap-3">
            <div className="font-semibold">Финансы</div>
            <div className="flex items-center gap-2">
              <div className="text-xs inline-flex items-center gap-1 mr-2">
                <button className={`h-7 px-2 rounded border ${preset==='7'?'bg-muted':''}`} onClick={()=>setPreset('7')}>7д</button>
                <button className={`h-7 px-2 rounded border ${preset==='30'?'bg-muted':''}`} onClick={()=>setPreset('30')}>30д</button>
                <button className={`h-7 px-2 rounded border ${preset==='90'?'bg-muted':''}`} onClick={()=>setPreset('90')}>90д</button>
                <button className={`h-7 px-2 rounded border ${preset==='all'?'bg-muted':''}`} onClick={()=>setPreset('all')}>Все</button>
              </div>
              <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2" onClick={exportCSV}><Download className="h-4 w-4" /> CSV</button>
              <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2" onClick={exportXLSX}><Download className="h-4 w-4" /> XLSX</button>
              <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="p-5 space-y-4 overflow-auto">
            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded border p-3 min-w-0">
                <div className="text-xs text-muted-foreground">Сумма доходов</div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(Math.round(stats.incSum),'RUB')}</div>
              </div>
              <div className="rounded border p-3 min-w-0">
                <div className="text-xs text-muted-foreground">Сумма расходов</div>
                <div className="text-lg font-semibold text-red-600 dark:text-red-400">{formatCurrency(Math.round(stats.expSum),'RUB')}</div>
              </div>
              <div className="rounded border p-3 min-w-0">
                <div className="text-xs text-muted-foreground">Средний дневной доход</div>
                <div className="text-lg font-semibold">{formatCurrency(Math.round(stats.avgIncome),'RUB')}</div>
              </div>
              <div className="rounded border p-3 min-w-0">
                <div className="text-xs text-muted-foreground">Средний дневной расход</div>
                <div className="text-lg font-semibold">{formatCurrency(Math.round(stats.avgExpense),'RUB')}</div>
              </div>
            </div>
            {/* Chart: последние 7 дней */}
            <div className="rounded border p-3 min-w-0">
              <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between gap-3">
                <span>Динамика доходов/расходов — {chartLabel}</span>
                <div className="w-[140px]">
                  <Select
                    className="w-full"
                    value={chartMode}
                    onChange={(v)=> setChartMode(v as 'days' | 'months')}
                    options={[
                      { value: 'days', label: 'Дни' },
                      { value: 'months', label: 'Месяца' },
                    ]}
                  />
                </div>
              </div>
              <div className="h-56">
                <ChartContainer
                  config={{
                    income: { label: 'Доход', color: 'hsl(var(--chart-1))' },
                    expense: { label: 'Расход', color: 'hsl(var(--chart-2))' },
                  }}
                  className="h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        padding={{ left: 24, right: 24 }}
                        tickFormatter={(value: string) =>
                          chartMode === 'days'
                            ? `${value.slice(8,10)}.${value.slice(5,7)}` // DD.MM
                            : `${value.slice(5,7)}.${value.slice(2,4)}`   // MM.YY
                        }
                      />
                      <YAxis
                        hide={false}
                        width={56}
                        tickFormatter={(v: number) => formatCurrency(Math.round(v), 'RUB')}
                      />
                      <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent indicator="dot" />} />
                      <Area
                        dataKey="expense"
                        name="расход"
                        type="monotone"
                        fill="var(--color-expense)"
                        fillOpacity={0.3}
                        stroke="var(--color-expense)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                      <Area
                        dataKey="income"
                        name="доход"
                        type="monotone"
                        fill="var(--color-income)"
                        fillOpacity={0.3}
                        stroke="var(--color-income)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>

            {/* Hours by project and employee */}
            <div className="rounded border p-3">
              <div className="text-sm text-muted-foreground mb-2">Часы по проектам и сотрудникам</div>
              <div className="max-h-56 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 px-2">Проект</th>
                      <th className="py-2 px-2">Сотрудник</th>
                      <th className="py-2 px-2 text-right">Часы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoursTable.map((r, i) => (
                      <tr key={`${r.projectId}:${r.employeeId}:${i}`} className="border-b last:border-b-0">
                        <td className="py-2 px-2 whitespace-nowrap">{r.projectName}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.employeeName}</td>
                        <td className="py-2 px-2 text-right">{Math.round(r.hours)}</td>
                      </tr>
                    ))}
                    {hoursTable.length === 0 && (
                      <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Нет данных</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick add */}
            <div className="p-4 border rounded bg-muted/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div className="md:col-span-12 text-xs text-muted-foreground flex flex-wrap gap-4">
                {Array.from(stats.byProject?.entries?.() || []).slice(0,6).map(([pid, v]) => (
                  <div key={pid} className="inline-flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-muted">{projects.find(p=>p.id===pid)?.name || pid}</span>
        <span className="text-green-600">+{Math.round(v.income)}</span>
        <span className="text-red-600">-{Math.round(v.expense)}</span>
                  </div>
                ))}
              </div>
              <div className="md:col-span-2"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Сумма" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} /></div>
              <div className="md:col-span-2"><Select className="w-full" value={type} onChange={(v)=> setType(v as any)} options={[{value:'income',label:'доход'},{value:'expense',label:'расход'}]} /></div>
              <div className="md:col-span-2"><DatePicker
                date={date ? new Date(date) : undefined}
                onDateChange={(newDate) => {
                  if (!newDate) { setDate(''); return }
                  const t = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000)
                  setDate(t.toISOString().slice(0, 10))
                }}
                placeholder="Дата"
                className="h-9 px-3 rounded border bg-background text-sm w-full"
              /></div>
              <div className="md:col-span-2"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Часы (опц.)" type="number" step="0.1" value={hours} onChange={(e)=>setHours(e.target.value)} /></div>
              <div className="md:col-span-2"><Select className="w-full" value={employeeId} onChange={setEmployeeId} options={[{value:'',label:'Сотрудник'},...employees.map(e=>({value:e.id,label:e.name}))]} /></div>
              <div className="md:col-span-2"><Select className="w-full" value={projectId} onChange={setProjectId} options={[{value:'',label:'Проект'},...projects.map(p=>({value:p.id,label:p.name}))]} /></div>

              <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Категория" value={category} onChange={(e)=>setCategory(e.target.value)} /></div>
              <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Теги (через запятую)" value={tags} onChange={(e)=>setTags(e.target.value)} /></div>
              <div className="md:col-span-4"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Описание" value={description} onChange={(e)=>setDescription(e.target.value)} /></div>
              <div className="md:col-span-2"><button className="h-9 w-full px-4 rounded border text-sm hover:bg-muted/40 inline-flex items-center justify-center gap-2" onClick={onAdd}><Plus className="h-4 w-4" /> Добавить</button></div>
            </div>

            {/* Filters removed (вся фильтрация и сортировка внутри таблицы). Оставили только пресеты диапазона в шапке. */}

            {/* Bulk actions removed by request */}

            {/* Table */}
            <TransactionsDataTable
              ref={tableRef as any}
              data={filtered as any}
              employees={employees as any}
              projects={projects as any}
              onDelete={handleDeleteTx}
              onSelectionChange={handleSelectionChange}
              hoursByTask={hoursByTask}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 