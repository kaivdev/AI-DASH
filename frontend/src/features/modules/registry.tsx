import { MetricsCard } from '@/features/metrics/MetricsCard'
import { NotesCard } from '@/features/notes/NotesCard'
import { TasksCard } from '@/features/tasks/TasksCard'
import { FinanceCard } from '@/features/finance/FinanceCard'

export type ModuleKey = 'metrics' | 'notes' | 'tasks' | 'finance'

export const registry: Record<ModuleKey, () => JSX.Element> = {
  metrics: MetricsCard,
  notes: NotesCard,
  tasks: TasksCard,
  finance: FinanceCard,
} 