import { ModuleCard } from '@/features/modules/ModuleCard'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { formatCurrency, formatDate } from '@/lib/format'
import { useMemo, useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { FinanceBoardDialog } from './FinanceBoardDialog'
import { QuickAddTransactionDialog } from './QuickAddTransactionDialog'
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Select } from '@/components/Select'

function getMonthKey(d: string) {
  return d.slice(0, 7) // YYYY-MM
}

export function FinanceCard() {
  const txs = useFinance((s) => s.txs)
  const remove = useFinance((s) => s.remove)
  const fetchFinance = useFinance((s) => s.fetch)
  const employees = useEmployees((s) => s.employees)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [presetType, setPresetType] = useState<'income' | 'expense' | null>(null)
  const [chartMode, setChartMode] = useState<'days' | 'months'>('days')

  useEffect(() => {
    fetchFinance().catch(()=>{})
  function onTitleClick(e: any) { if (e?.detail?.id === 'finance') setDialogOpen(true) }
    window.addEventListener('module-title-click', onTitleClick as any)
    return () => window.removeEventListener('module-title-click', onTitleClick as any)
  }, [fetchFinance])

  // Summary
  const income = txs.filter((t) => (t as any).transaction_type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter((t) => (t as any).transaction_type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  // Per-employee profit
  const perEmployeeAll = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    for (const t of txs) {
      const eid = (t as any).employee_id as string | undefined
      if (!eid) continue
      const row = map.get(eid) || { income: 0, expense: 0 }
      if ((t as any).transaction_type === 'income') row.income += t.amount
      else row.expense += t.amount
      map.set(eid, row)
    }
    const rows = Array.from(map.entries()).map(([eid, v]) => ({ id: eid, name: employees.find(e=>e.id===eid)?.name || eid, income: v.income, expense: v.expense, profit: v.income - v.expense }))
    return rows.sort((a,b)=> b.profit - a.profit)
  }, [txs, employees])

  // Chart data: 7 дней вокруг сегодня или последние 6 месяцев
  const chartData = useMemo(() => {
    if (chartMode === 'days') {
      const range: string[] = []
      const today = new Date()
      for (let offset = -3; offset <= 3; offset++) {
        const d = new Date(today)
        d.setDate(today.getDate() + offset)
        range.push(d.toISOString().slice(0, 10))
      }
      const byDay = new Map<string, { date: string; income: number; expense: number }>()
      for (const day of range) byDay.set(day, { date: day, income: 0, expense: 0 })
      for (const t of txs) {
        if (!byDay.has(t.date)) continue
        const row = byDay.get(t.date)!
        if ((t as any).transaction_type === 'income') row.income += t.amount
        else row.expense += t.amount
        byDay.set(t.date, row)
      }
      return range.map((day) => byDay.get(day)!)
    }
    // months mode
    const rangeM: string[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      rangeM.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const byMonth = new Map<string, { date: string; income: number; expense: number }>()
    for (const m of rangeM) byMonth.set(m, { date: m, income: 0, expense: 0 })
    for (const t of txs) {
      const m = t.date.slice(0, 7)
      if (!byMonth.has(m)) continue
      const row = byMonth.get(m)!
      if ((t as any).transaction_type === 'income') row.income += t.amount
      else row.expense += t.amount
      byMonth.set(m, row)
    }
    return rangeM.map((m) => byMonth.get(m)!)
  }, [txs, chartMode])

  // Last 8 transactions compact
  const lastTx = useMemo(() => txs.slice().sort((a,b)=> b.date.localeCompare(a.date)).slice(0,8), [txs])

  function openDialog(type: 'income' | 'expense') {
  setPresetType(type)
  setQuickOpen(true)
  }

  // Trend vs previous period (days: last 7 vs prev 7; months: this month vs prev month)
  const trend = useMemo(() => {
    const today = new Date()
    const toStr = (d: Date) => d.toISOString().slice(0,10)
    let currNet = 0
    let prevNet = 0
    if (chartMode === 'days') {
      const currStart = new Date(today); currStart.setDate(today.getDate() - 6)
      const prevEnd = new Date(today); prevEnd.setDate(today.getDate() - 7)
      const prevStart = new Date(today); prevStart.setDate(today.getDate() - 13)
      const cs = toStr(currStart), ce = toStr(today)
      const ps = toStr(prevStart), pe = toStr(prevEnd)
      for (const t of txs) {
        const d = t.date
        if (d >= cs && d <= ce) currNet += (t as any).transaction_type === 'income' ? t.amount : -t.amount
        else if (d >= ps && d <= pe) prevNet += (t as any).transaction_type === 'income' ? t.amount : -t.amount
      }
    } else {
      const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const currYM = ym(today)
      const prevD = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const prevYM = ym(prevD)
      for (const t of txs) {
        const m = t.date.slice(0,7)
        if (m === currYM) currNet += (t as any).transaction_type === 'income' ? t.amount : -t.amount
        else if (m === prevYM) prevNet += (t as any).transaction_type === 'income' ? t.amount : -t.amount
      }
    }
    const diff = currNet - prevNet
    const pct = prevNet === 0 ? 0 : Math.round((diff / Math.abs(prevNet)) * 100)
    return { pct, sign: Math.sign(diff) as -1 | 0 | 1 }
  }, [txs, chartMode])

  return (
    <ModuleCard id="finance" title="Финансы" size="2x2" footer={<div className="text-xs flex items-center gap-2">Быстро:
      <button className="h-7 px-2 rounded border text-xs" onClick={() => openDialog('income')}>+ доход</button>
      <button className="h-7 px-2 rounded border text-xs" onClick={() => openDialog('expense')}>+ расход</button>
    </div>}>
  <FinanceBoardDialog open={dialogOpen} presetType={null} onClose={() => { setDialogOpen(false) }} />
  <QuickAddTransactionDialog open={quickOpen} presetType={presetType} onClose={() => { setQuickOpen(false); setPresetType(null) }} />

      <div className="flex flex-col gap-4 h-full min-h-0">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded border p-3 text-center">
            <div className="text-xs text-muted-foreground">Доходы</div>
                         <div className="text-2xl font-semibold text-green-600 dark:text-green-400">{formatCurrency(income, 'RUB')}</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-xs text-muted-foreground">Расходы</div>
                         <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(expense, 'RUB')}</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-xs text-muted-foreground">Баланс</div>
                         <div className="text-2xl font-semibold">{formatCurrency(balance, 'RUB')}</div>
          </div>
        </div>

        {/* Mini chart + trend */}
        <div className="rounded border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              Режим:
              <div className="w-[120px]"><Select value={chartMode} onChange={(v)=> setChartMode(v as any)} options={[{value:'days',label:'Дни'},{value:'months',label:'Месяца'}]} /></div>
            </div>
            <div className={`text-xs inline-flex items-center gap-1 ${trend.sign>0?'text-green-500':trend.sign<0?'text-red-500':'text-muted-foreground'}`}>
              {trend.sign >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {trend.sign >= 0 ? '↑' : '↓'} {Math.abs(trend.pct)}% {chartMode==='days' ? 'к прошлой неделе' : 'к прошлому месяцу'}
            </div>
          </div>
          <div className="h-28">
            <ChartContainer
              config={{
                income: { label: 'Доход', color: 'var(--chart-1, #22c55e)' },
                expense: { label: 'Расход', color: 'var(--chart-2, #ef4444)' },
              }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
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
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Area
                    dataKey="expense"
                    name="расход"
                    type="natural"
                    fill="var(--color-expense)"
                    fillOpacity={0.35}
                    stroke="var(--color-expense)"
                    strokeWidth={2}
                    stackId="a"
                  />
                  <Area
                    dataKey="income"
                    name="доход"
                    type="natural"
                    fill="var(--color-income)"
                    fillOpacity={0.35}
                    stroke="var(--color-income)"
                    strokeWidth={2}
                    stackId="a"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Top employees by прибыль */}
        {perEmployeeAll.slice(0,4).length > 0 && (
          <div className="rounded border p-3">
            <div className="text-sm text-muted-foreground mb-2">Топ сотрудников по прибыли</div>
            <div className="space-y-1">
              {perEmployeeAll.slice(0,4).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div className="truncate mr-2">{e.name}</div>
                  <div className="inline-flex items-center gap-3 whitespace-nowrap">
                    <span className="text-green-600">{formatCurrency(e.income,'RUB')}</span>
                    <span className="text-red-600">{formatCurrency(e.expense,'RUB')}</span>
                    <span className="font-medium">{formatCurrency(e.profit,'RUB')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full per-employee table */}
        {perEmployeeAll.length > 0 && (
          <div className="rounded border p-3">
            <div className="text-sm text-muted-foreground mb-2">Прибыль по сотрудникам</div>
            <div className="max-h-40 overflow-auto">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-medium px-2 py-1 border-b">
                <div>Сотрудник</div>
                <div className="text-right">Доход</div>
                <div className="text-right">Расход</div>
                <div className="text-right">Прибыль</div>
              </div>
              {perEmployeeAll.map((e)=> (
                <div key={e.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1 text-sm border-b last:border-b-0">
                  <div className="truncate mr-2">{e.name}</div>
                  <div className="text-right text-green-600">{formatCurrency(e.income,'RUB')}</div>
                  <div className="text-right text-red-600">{formatCurrency(e.expense,'RUB')}</div>
                  <div className="text-right font-medium">{formatCurrency(e.profit,'RUB')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last transactions */}
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-1">
            {lastTx.map((t) => (
              <div key={t.id} className="px-3 py-2 rounded border flex items-center justify-between">
                <div className="text-xs text-muted-foreground w-24">{formatDate(t.date)}</div>
                <div className="text-sm flex-1 truncate">{t.category || '-'}</div>
                                 <div className={(t as any).transaction_type === 'income' ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                  {(t as any).transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.amount, 'RUB')}
                </div>
                <button className="ml-3 h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => remove(t.id)} title="Удалить" aria-label="Удалить"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {lastTx.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Нет операций</div>}
          </div>
        </div>
      </div>
    </ModuleCard>
  )
} 