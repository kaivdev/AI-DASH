import { ModuleCard } from '@/features/modules/ModuleCard'
import { useNotes } from '@/stores/useNotes'
import { useTasks } from '@/stores/useTasks'
import { useFinance } from '@/stores/useFinance'
import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

function daysBackISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function MetricsCard() {
  const notes = useNotes((s) => s.notes)
  const tasks = useTasks((s) => s.tasks)
  const txs = useFinance((s) => s.txs)

  const last7Data = useMemo(() => {
    const range: string[] = []
    for (let i = 6; i >= 0; i--) range.push(daysBackISO(i))

    const perDay = new Map<string, { notes: number; tasks: number }>()
    range.forEach((d) => perDay.set(d, { notes: 0, tasks: 0 }))

    for (const n of notes) {
      if (perDay.has(n.date)) perDay.get(n.date)!.notes += 1
    }
    for (const t of tasks) {
      const ts = (t.updated_at || t.created_at || new Date().toISOString()).slice(0, 10)
      if (t.done && perDay.has(ts)) perDay.get(ts)!.tasks += 1
    }

    return range.map((d) => ({ date: d.slice(5), notes: perDay.get(d)!.notes, tasks: perDay.get(d)!.tasks }))
  }, [notes, tasks])

  const sums = useMemo(() => {
    const weekStart = daysBackISO(6)
    const notesThisWeek = notes.filter((n) => n.date >= weekStart).length
    const tasksDoneThisWeek = tasks.filter((t) => t.done && (t.updated_at || t.created_at || '').slice(0, 10) >= weekStart).length

    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let income = 0
    let expense = 0
    for (const t of txs) {
      const date = t.date
      if (!date.startsWith(ym)) continue
      const type = (t as any).type ?? (t as any).transaction_type
      if (type === 'income') income += t.amount
      else if (type === 'expense') expense += t.amount
    }
    const balance = income - expense
    return { notesThisWeek, tasksDoneThisWeek, balance }
  }, [notes, tasks, txs])

  return (
    <ModuleCard id="metrics" title="Metrics / Snapshot" size="2x2">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-semibold">{sums.notesThisWeek}</div>
            <div className="text-sm text-muted-foreground">Заметок за 7 дней</div>
          </div>
          <div>
            <div className="text-3xl font-semibold">{sums.tasksDoneThisWeek}</div>
            <div className="text-sm text-muted-foreground">Задач выполнено</div>
          </div>
          <div>
            <div className="text-3xl font-semibold">{sums.balance >= 0 ? `+${sums.balance}` : sums.balance}</div>
            <div className="text-sm text-muted-foreground">Баланс за месяц</div>
          </div>
        </div>

        <div className="rounded border p-3">
          <div className="text-sm text-muted-foreground mb-2">Активность за 7 дней</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="notes" name="Заметки" fill="#6366f1" radius={[2,2,0,0]} />
                <Bar dataKey="tasks" name="Задачи" fill="#22c55e" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ModuleCard>
  )
} 