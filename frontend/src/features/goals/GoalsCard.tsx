import { ModuleCard } from '@/features/modules/ModuleCard'
import { useGoals } from '@/stores/useGoals'
import { useState } from 'react'
import { Plus, X, Trash2, PlusCircle, MinusCircle } from 'lucide-react'
import { Select } from '@/components/Select'
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

export function GoalsCard() {
  const goals = useGoals((s) => s.goals)
  const add = useGoals((s) => s.add)
  const updateProgress = useGoals((s) => s.updateProgress)
  const remove = useGoals((s) => s.remove)

  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('quarterly')
  const [tags, setTags] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  function onAdd() {
    if (!title.trim()) return
    
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()
    
    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (period === 'quarterly') {
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1)
      endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    }

    add({
      title: title.trim(),
      description: description.trim(),
      period,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      status: 'active',
      progress: 0,
      tags: tags.trim().split(',').map(t => t.trim()).filter(Boolean)
    } as any)
    setTitle('')
    setDescription('')
    setTags('')
    setShowAddForm(false)
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-1 dark:ring-yellow-500/20'
  }

  const periodLabels = {
    monthly: 'Месяц',
    quarterly: 'Квартал',
    yearly: 'Год'
  }

  return (
    <ModuleCard
      id="goals"
      title="Цели"
      size="2x2"
      headerActions={
        <button
          className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? (<><X className="h-4 w-4" /> Отмена</>) : (<><Plus className="h-4 w-4" /> Добавить</>)}
        </button>
      }
    >
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="text-sm text-muted-foreground">Активных: {goals.filter(g => g.status === 'active').length}</div>

        {showAddForm && (
          <div className="p-3 border rounded bg-muted/10">
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block">Название цели *</label>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="Достичь..."
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Описание</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="px-3 py-2 rounded border bg-background w-full text-sm resize-none"
                  rows={2}
                  placeholder="Подробное описание цели..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block">Период</label>
                  <Select value={period} onChange={(v)=>setPeriod(v as any)} options={[{value:'monthly',label:'Месячная'},{value:'quarterly',label:'Квартальная'},{value:'yearly',label:'Годовая'}]} />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Теги (через запятую)</label>
                  <input 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)}
                    className="h-8 px-3 rounded border bg-background w-full text см"
                    placeholder="business, growth"
                  />
                </div>
              </div>
            </div>
            <button 
              className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground mt-3 inline-flex items-center gap-2"
              onClick={onAdd}
            >
              <Plus className="h-4 w-4" /> Создать цель
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <AlertDialog open={confirmOpen} onOpenChange={(o)=>{ if(!o){ setConfirmOpen(false); setPendingDeleteId(null) } }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Цель будет удалена.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={()=>{ setConfirmOpen(false); setPendingDeleteId(null) }}>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={async ()=>{ if(pendingDeleteId){ try { await remove(pendingDeleteId) } catch {} } setConfirmOpen(false); setPendingDeleteId(null) }}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="space-y-3">
            {goals.length === 0 && (
              <EmptyState
                title="Нет данных"
                description="Добавьте свою первую цель, чтобы начать планирование и достижение результатов"
                actions={[
                  {
                    label: '+ Добавить цель',
                    onClick: () => setShowAddForm(true),
                    variant: 'default'
                  }
                ]}
              />
            )}
            {goals.map((goal) => (
              <div key={goal.id} className="p-3 border rounded">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">{goal.title}</div>
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[goal.status]}`}>
                        {periodLabels[goal.period]}
                      </span>
                    </div>
                    {goal.description && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {goal.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mb-2">
                      {goal.start_date} — {goal.end_date}
                    </div>
                  </div>
                  <button 
                    className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                    onClick={() => { setPendingDeleteId(goal.id); setConfirmOpen(true) }}
                    title="Удалить" aria-label="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Прогресс</span>
                    <span className="text-sm font-medium">{goal.progress}%</span>
                  </div>
                  <div className="w-full rounded-full h-2 bg-gray-200 dark:bg-gray-700/60">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.35)]"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>

                {goal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {goal.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-purple-500/10 dark:text-purple-200 dark:ring-1 dark:ring-purple-500/20 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    className="h-7 px-2 rounded border bg-background text-xs w-20"
                    placeholder={`${goal.progress}`}
                    onBlur={(e) => {
                      const value = Number(e.target.value)
                      if (value >= 0 && value <= 100) {
                        updateProgress(goal.id, value)
                        e.target.value = ''
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = Number((e.target as HTMLInputElement).value)
                        if (value >= 0 && value <= 100) {
                          updateProgress(goal.id, value)
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }
                    }}
                  />
                  <button 
                    className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                    onClick={() => updateProgress(goal.id, Math.min(100, goal.progress + 10))}
                    title="+10%" aria-label="+10%"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                    onClick={() => updateProgress(goal.id, Math.max(0, goal.progress - 10))}
                    title="-10%" aria-label="-10%"
                  >
                    <MinusCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleCard>
  )
}