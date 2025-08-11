import { ModuleCard } from '@/features/modules/ModuleCard'
import { useFinance } from '@/stores/useFinance'
import { useEmployees } from '@/stores/useEmployees'
import { formatCurrency, formatDate } from '@/lib/format'
import { useMemo, useState } from 'react'

function getMonthKey(d: string) {
  return d.slice(0, 7) // YYYY-MM
}

export function FinanceCard() {
  const txs = useFinance((s) => s.txs)
  const add = useFinance((s) => s.add)
  const remove = useFinance((s) => s.remove)
  const employees = useEmployees((s) => s.employees)

  const [period, setPeriod] = useState<'this' | 'last' | 'all'>('this')
  const [currency] = useState('USD')

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`

  const filtered = useMemo(() => {
    if (period === 'all') return txs
    const key = period === 'this' ? thisMonth : lastMonth
    return txs.filter((t) => getMonthKey(t.date) === key)
  }, [txs, period, thisMonth, lastMonth])

  const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  // quick add form
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  function onAdd() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    add({ 
      amount: value, 
      type, 
      date, 
      category, 
      description,
      tags: tags.trim().split(',').map(t => t.trim()).filter(Boolean),
      employeeId: employeeId || undefined
    })
    setAmount('')
    setCategory('')
    setDescription('')
    setTags('')
    setEmployeeId('')
  }

  return (
    <ModuleCard id="finance" title="Финансы" size="2x2" footer={<div className="text-xs">Период:
      <select className="ml-2 border rounded px-2 py-1 bg-background" value={period} onChange={(e) => setPeriod(e.target.value as any)}>
        <option value="this">Этот месяц</option>
        <option value="last">Прошлый месяц</option>
        <option value="all">Все время</option>
      </select>
    </div>}>
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded border p-3 text-center">
            <div className="text-xs text-muted-foreground">Доходы</div>
            <div className="text-2xl font-semibold text-green-600">{formatCurrency(income, currency)}</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-xs text-muted-foreground">Расходы</div>
            <div className="text-2xl font-semibold text-red-600">{formatCurrency(expense, currency)}</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-xs text-muted-foreground">Баланс</div>
            <div className="text-2xl font-semibold">{formatCurrency(balance, currency)}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col w-[140px] min-w-[120px]">
            <label className="text-xs mb-1">Сумма</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 px-3 rounded border bg-background w-full" />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs">Тип</label>
            <label className="text-sm flex items-center gap-1"><input type="radio" checked={type==='income'} onChange={() => setType('income')} /> доход</label>
            <label className="text-sm flex items-center gap-1"><input type="radio" checked={type==='expense'} onChange={() => setType('expense')} /> расход</label>
          </div>
          <div className="flex flex-col w-[160px] min-w-[140px]">
            <label className="text-xs mb-1">Дата</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 px-3 rounded border bg-background w-full" />
          </div>
          <div className="flex flex-col w-[200px] min-w-[160px]">
            <label className="text-xs mb-1">Категория</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 px-3 rounded border bg-background w-full" />
          </div>
          <div className="flex flex-col w-[200px] min-w-[160px]">
            <label className="text-xs mb-1">Теги</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="h-9 px-3 rounded border bg-background w-full" placeholder="еда, транспорт" />
          </div>
          <div className="flex flex-col w-[200px] min-w-[160px]">
            <label className="text-xs mb-1">Сотрудник</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-9 px-3 rounded border bg-background w-full">
              <option value="">Не выбрано</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs mb-1">Описание</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 px-3 rounded border bg-background w-full" />
          </div>
          <button className="h-9 px-3 rounded border shrink-0" onClick={onAdd}>Добавить</button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-muted-foreground border-b">
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
                const employee = t.employeeId ? employees.find(e => e.id === t.employeeId) : null
                return (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="py-2 pr-2">
                      <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {t.type === 'income' ? 'доход' : 'расход'}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right font-medium">{formatCurrency(t.amount, currency)}</td>
                    <td className="py-2 pr-2">{t.category || '-'}</td>
                    <td className="py-2 pr-2">
                      {t.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.tags.map((tag, i) => (
                            <span key={i} className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-2 pr-2">{employee?.name || '-'}</td>
                    <td className="py-2 pr-2">{t.description || '-'}</td>
                    <td className="py-2 pr-2 text-right">
                      <button className="text-xs text-red-600 hover:underline" onClick={() => remove(t.id)}>Удалить</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleCard>
  )
} 