import { ModuleCard } from '@/features/modules/ModuleCard'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { formatCurrency, formatDate } from '@/lib/format'
import { useMemo, useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { FinanceBoardDialog } from './FinanceBoardDialog'
import { QuickAddTransactionDialog } from './QuickAddTransactionDialog'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
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
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('7')

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

  // Chart data by selected period
  const chartData = useMemo(() => {
    const sorted = txs.slice().sort((a,b)=> a.date.localeCompare(b.date))
    const byDate = new Map<string, { date: string; income: number; expense: number }>()
    if (period === 'all') {
      for (const t of sorted) {
        if (!byDate.has(t.date)) byDate.set(t.date, { date: t.date, income: 0, expense: 0 })
        const row = byDate.get(t.date)!
        if ((t as any).transaction_type === 'income') row.income += t.amount
        else row.expense += t.amount
      }
      return Array.from(byDate.values())
    }
    const today = new Date()
    const nDays = Number(period)
    const threshold = new Date(today)
    threshold.setDate(today.getDate() - (nDays - 1))
    const thrStr = threshold.toISOString().slice(0,10)
    for (const t of sorted) {
      if (t.date < thrStr) continue
      if (!byDate.has(t.date)) byDate.set(t.date, { date: t.date, income: 0, expense: 0 })
      const row = byDate.get(t.date)!
      if ((t as any).transaction_type === 'income') row.income += t.amount
      else row.expense += t.amount
    }
    return Array.from(byDate.values())
  }, [txs, period])

  // Last 8 transactions compact
  const lastTx = useMemo(() => txs.slice().sort((a,b)=> b.date.localeCompare(a.date)).slice(0,8), [txs])

  function openDialog(type: 'income' | 'expense') {
  setPresetType(type)
  setQuickOpen(true)
  }

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
              Период:
              <div className="w-[120px]"><Select value={period} onChange={(v)=> setPeriod(v as any)} options={[{value:'7',label:'7 дней'},{value:'30',label:'30 дней'},{value:'90',label:'90 дней'},{value:'all',label:'Все время'}]} /></div>
            </div>
            <div className="text-xs inline-flex items-center gap-1 text-green-500"><TrendingUp className="h-3.5 w-3.5" /> ↑ 12% к прошлой неделе</div>
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 6, right: 6 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" hide tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="income" name="доход" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" name="расход" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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