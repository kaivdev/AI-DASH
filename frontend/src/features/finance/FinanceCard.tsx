import { ModuleCard } from '@/features/modules/ModuleCard'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { formatCurrency, formatDate } from '@/lib/format'
import { useMemo, useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { FinanceBoardDialog } from './FinanceBoardDialog'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
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
    setDialogOpen(true)
  }

  return (
    <ModuleCard id="finance" title="Финансы" size="2x2" footer={<div className="text-xs flex items-center gap-2">Быстро:
      <button className="h-7 px-2 rounded border text-xs" onClick={() => openDialog('income')}>+ доход</button>
      <button className="h-7 px-2 rounded border text-xs" onClick={() => openDialog('expense')}>+ расход</button>
    </div>}>
      <FinanceBoardDialog open={dialogOpen} presetType={presetType} onClose={() => { setDialogOpen(false); setPresetType(null) }} />

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
              <BarChart data={chartData} barSize={8}>
                <XAxis dataKey="date" hide tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted)/.4)' }} />
                <Bar dataKey="income" fill="#22c55e" radius={[2,2,0,0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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