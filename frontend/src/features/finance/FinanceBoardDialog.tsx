import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { useProjects } from '@/stores/useProjects'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import { X, Plus, Trash2, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { Checkbox } from '@/components/ui/checkbox'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

export function FinanceBoardDialog({ open, onClose, presetType }: { open: boolean; onClose: () => void; presetType: 'income' | 'expense' | null }) {
  const [show, setShow] = useState(false)
  const txs = useFinance((s) => s.txs)
  const add = useFinance((s) => s.add)
  const remove = useFinance((s) => s.remove)
  const employees = useEmployees((s) => s.employees)
  const projects = useProjects((s) => s.projects)

  // quick add form
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  // filters
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagsFilter, setTagsFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll(ids: string[]) {
    setSelected(new Set(ids))
  }
  function clearSelection() { setSelected(new Set()) }

  // Add period presets state
  const [preset, setPreset] = useState<'7'|'30'|'90'|'all'>('30')

  // Apply preset to date filters
  useEffect(() => {
    const today = new Date()
    const toISO = (d: Date) => d.toISOString().slice(0,10)
    if (preset === 'all') { setDateFrom(''); setDateTo(''); return }
    const n = preset==='7'?7:preset==='30'?30:90
    const start = new Date(today); start.setDate(today.getDate() - (n-1))
    setDateFrom(toISO(start)); setDateTo(toISO(today))
  }, [preset])

  useEffect(() => {
    if (open) {
      setShow(true)
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', onKey)
  if (presetType) setType(presetType)
  return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
    } else {
      const t = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(t)
    }
  }, [open, presetType])

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (filterType !== 'all' && (t as any).transaction_type !== filterType) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      if (categoryFilter && !(t.category || '').toLowerCase().includes(categoryFilter.toLowerCase())) return false
      if (tagsFilter) {
        const tf = tagsFilter.toLowerCase()
        const list = Array.isArray((t as any).tags) ? (t as any).tags : []
        if (!list.some((tg: string) => (tg || '').toLowerCase().includes(tf))) return false
      }
      if (employeeFilter && (t as any).employee_id !== employeeFilter) return false
      if (projectFilter && (t as any).project_id !== projectFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!(t.category || '').toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false
      }
      const v = Number(t.amount)
      if (minAmount && v < Number(minAmount)) return false
      if (maxAmount && v > Number(maxAmount)) return false
      return true
    }).sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'date') return mul * a.date.localeCompare(b.date)
      return mul * (a.amount - b.amount)
    })
  }, [txs, filterType, dateFrom, dateTo, categoryFilter, tagsFilter, employeeFilter, projectFilter, query, minAmount, maxAmount, sortBy, sortDir])

  // charts
  const pieData = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of filtered) {
      if ((t as any).transaction_type !== 'expense') continue
      const key = t.category || '—'
      map.set(key, (map.get(key) || 0) + t.amount)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [filtered])

  const lineData = useMemo(() => {
    if (filtered.length === 0) return []
    const dates = filtered.map(t => t.date).sort()
    const start = dates[0]
    const end = dates[dates.length - 1]
    // build daily range
    const range: string[] = []
    const d = new Date(start)
    const endD = new Date(end)
    while (d <= endD) {
      range.push(d.toISOString().slice(0,10))
      d.setDate(d.getDate() + 1)
    }
    // daily sums
    const daySum = new Map<string, { income: number; expense: number }>()
    for (const day of range) daySum.set(day, { income: 0, expense: 0 })
    for (const t of filtered) {
      const key = t.date
      const row = daySum.get(key) || { income: 0, expense: 0 }
      if ((t as any).transaction_type === 'income') row.income += t.amount
      else row.expense += t.amount
      daySum.set(key, row)
    }
    // cumulative series
    let accInc = 0
    let accExp = 0
    return range.map((day) => {
      const sums = daySum.get(day)!
      accInc += sums.income
      accExp += sums.expense
      return { date: day, income: accInc, expense: accExp }
    })
  }, [filtered])

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
    add({ amount: value, transaction_type: type, date, category, description, tags: tags.split(',').map(t=>t.trim()).filter(Boolean), employee_id: employeeId || undefined } as any)
    setAmount(''); setCategory(''); setDescription(''); setTags(''); setEmployeeId('')
  }

  function exportCSV() {
    const header = ['date','type','amount','category','tags','employee','description']
    const rows = filtered.map((t) => [
      t.date,
      (t as any).transaction_type,
      String(t.amount),
      t.category || '',
      (Array.isArray((t as any).tags) ? (t as any).tags : []).join('|'),
      (t as any).employee_id || '',
      t.description || ''
    ])
    const csv = [header, ...rows].map(r => r.map((x)=>`"${String(x).split('"').join('""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance_${new Date().toISOString().slice(0,10)}.csv`
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
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 flex flex-col ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-5 border-b flex items-center justify-between gap-3">
            <div className="font-semibold">Финансы</div>
            <div className="flex items-center gap-2">
              <div className="text-xs inline-flex items-center gap-1 mr-2">
                <button className={`h-7 px-2 rounded border ${preset==='7'?'bg-muted':''}`} onClick={()=>setPreset('7')}>7д</button>
                <button className={`h-7 px-2 rounded border ${preset==='30'?'bg-muted':''}`} onClick={()=>setPreset('30')}>30д</button>
                <button className={`h-7 px-2 rounded border ${preset==='90'?'bg-muted':''}`} onClick={()=>setPreset('90')}>90д</button>
                <button className={`h-7 px-2 rounded border ${preset==='all'?'bg-muted':''}`} onClick={()=>setPreset('all')}>Все</button>
              </div>
              <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</button>
              <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="p-5 space-y-4 overflow-auto">
            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded border p-3 min-w-0"><div className="text-xs text-muted-foreground">Сумма доходов</div><div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(stats.incSum,'RUB')}</div></div>
              <div className="rounded border p-3 min-w-0"><div className="text-xs text-muted-foreground">Сумма расходов</div><div className="text-lg font-semibold text-red-600 dark:text-red-400">{formatCurrency(stats.expSum,'RUB')}</div></div>
              <div className="rounded border p-3 min-w-0"><div className="text-xs text-muted-foreground">Средний дневной доход</div><div className="text-lg font-semibold">{formatCurrency(stats.avgIncome,'RUB')}</div></div>
              <div className="rounded border p-3 min-w-0"><div className="text-xs text-muted-foreground">Средний дневной расход</div><div className="text-lg font-semibold">{formatCurrency(stats.avgExpense,'RUB')}</div></div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded border p-3 min-w-0">
                <div className="text-sm text-muted-foreground mb-2">Распределение расходов по категориям</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                        {pieData.map((_, i) => <Cell key={i} fill={["#22c55e","#ef4444","#6366f1","#f59e0b","#06b6d4","#84cc16"][i % 6]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded border p-3 min-w-0">
                <div className="text-sm text-muted-foreground mb-2">Динамика доходов/расходов (накопит.)</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick add */}
            <div className="p-4 border rounded bg-muted/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-12 text-xs text-muted-foreground flex flex-wrap gap-4">
                {Array.from(stats.byProject?.entries?.() || []).slice(0,6).map(([pid, v]) => (
                  <div key={pid} className="inline-flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-muted">{projects.find(p=>p.id===pid)?.name || pid}</span>
                    <span className="text-green-600">+{v.income}</span>
                    <span className="text-red-600">-{v.expense}</span>
                  </div>
                ))}
              </div>
              <div className="md:col-span-2"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Сумма" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} /></div>
              <div className="md:col-span-2"><Select className="w-full" value={type} onChange={(v)=> setType(v as any)} options={[{value:'income',label:'доход'},{value:'expense',label:'расход'}]} /></div>
              <div className="md:col-span-2"><DatePicker 
                date={date ? new Date(date) : undefined} 
                onDateChange={(newDate) => setDate(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                placeholder="Дата"
              /></div>
              <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Категория" value={category} onChange={(e)=>setCategory(e.target.value)} /></div>
              <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Теги (через запятую)" value={tags} onChange={(e)=>setTags(e.target.value)} /></div>
              <div className="md:col-span-3"><Select className="w-full" value={employeeId} onChange={setEmployeeId} options={[{value:'',label:'Сотрудник'},...employees.map(e=>({value:e.id,label:e.name}))]} /></div>
              <div className="md:col-span-7"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Описание" value={description} onChange={(e)=>setDescription(e.target.value)} /></div>
              <div className="md:col-span-2"><button className="h-9 w-full px-4 rounded border text-sm hover:bg-muted/40 inline-flex items-center justify-center gap-2" onClick={onAdd}><Plus className="h-4 w-4" /> Добавить</button></div>
            </div>

            {/* Filters */}
            <div className="p-4 border rounded bg-muted/5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Поиск (категория/описание)" value={query} onChange={(e)=>setQuery(e.target.value)} /></div>
              <div className="md:col-span-2"><Select className="w-full" value={filterType} onChange={(v)=>setFilterType(v as any)} options={[{value:'all',label:'Все'},{value:'income',label:'Доходы'},{value:'expense',label:'Расходы'}]} /></div>
              <div className="md:col-span-2"><DatePicker 
                date={dateFrom ? new Date(dateFrom) : undefined} 
                onDateChange={(newDate) => setDateFrom(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                placeholder="От даты"
              /></div>
              <div className="md:col-span-2"><DatePicker 
                date={dateTo ? new Date(dateTo) : undefined} 
                onDateChange={(newDate) => setDateTo(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                placeholder="До даты"
              /></div>
              <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Категория" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} /></div>
              <div className="md:col-span-3"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="Теги" value={tagsFilter} onChange={(e)=>setTagsFilter(e.target.value)} /></div>
                             <div className="md:col-span-2"><Select className="w-full" value={employeeFilter} onChange={setEmployeeFilter} options={[{value:'',label:'Сотрудник'},...employees.map(e=>({value:e.id,label:e.name}))]} /></div>
               <div className="md:col-span-2"><Select className="w-full" value={projectFilter} onChange={setProjectFilter} options={[{value:'',label:'Проект'},...projects.map(p=>({value:p.id,label:p.name}))]} /></div>
              <div className="md:col-span-2"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder=">= сумма" type="number" value={minAmount} onChange={(e)=>setMinAmount(e.target.value)} /></div>
              <div className="md:col-span-2"><input className="h-9 px-3 rounded border bg-background text-sm w-full" placeholder="<= сумма" type="number" value={maxAmount} onChange={(e)=>setMaxAmount(e.target.value)} /></div>
              <div className="md:col-span-1"><Select className="w-full" value={sortBy} onChange={(v)=>setSortBy(v as any)} options={[{value:'date',label:'Дата'},{value:'amount',label:'Сумма'}]} /></div>
              <div className="md:col-span-2"><Select className="w-full" value={sortDir} onChange={(v)=>setSortDir(v as any)} options={[{value:'desc',label:'По убыв.'},{value:'asc',label:'По возр.'}]} /></div>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Выбрано: {selected.size}</div>
              <div className="flex items-center gap-2">
                <button className="h-8 px-3 rounded border text-xs" disabled={selected.size===0} onClick={bulkDelete}>Удалить выбранные</button>
                <button className="h-8 px-3 rounded border text-xs" onClick={()=> selectAll(filtered.map(t=>t.id))}>Выделить все</button>
                <button className="h-8 px-3 rounded border text-xs" onClick={clearSelection}>Снять выделение</button>
              </div>
            </div>

            {/* Table */}
            <div className="min-h-0 overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-2 w-8"></th>
                    <th className="py-2 pr-2">Дата</th>
                    <th className="py-2 pr-2">Тип</th>
                    <th className="py-2 pr-2 text-right">Сумма</th>
                    <th className="py-2 pr-2">Категория</th>
                    <th className="py-2 pr-2">Теги</th>
                    <th className="py-2 pr-2">Сотрудник</th>
                    <th className="py-2 pr-2">Описание</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const employee = (t as any).employee_id ? employees.find(e => e.id === (t as any).employee_id) : null
                    const isSel = selected.has(t.id)
                    const tagsArr = Array.isArray((t as any).tags) ? (t as any).tags : []
                    return (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 pr-2 w-8"><Checkbox checked={isSel} onCheckedChange={()=> toggleSelect(t.id)} /></td>
                        <td className="py-2 pr-2 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="py-2 pr-2">
                          <span className={(t as any).transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {(t as any).transaction_type === 'income' ? 'доход' : 'расход'}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-right font-medium">{formatCurrency(t.amount, 'RUB')}</td>
                        <td className="py-2 pr-2">{t.category || '-'}</td>
                        <td className="py-2 pr-2">
                          {tagsArr.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {tagsArr.map((tag: string, i: number) => (
                                <span key={i} className="px-1 py-0.5 bg-gray-100 text-gray-700 dark:bg-purple-500/10 dark:text-purple-200 dark:ring-1 dark:ring-purple-500/20 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-2 pr-2">{employee?.name || '-'}</td>
                        <td className="py-2 pr-2">{t.description || '-'}</td>
                        <td className="py-2 pr-2 text-right">
                          <button className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => remove(t.id)} title="Удалить" aria-label="Удалить"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 