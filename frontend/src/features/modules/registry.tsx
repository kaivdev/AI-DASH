import { MetricsCard } from '@/features/metrics/MetricsCard'
import { NotesCard } from '@/features/notes/NotesCard'
import { TasksCard } from '@/features/tasks/TasksCard'

export type ModuleKey = 'metrics' | 'notes' | 'tasks'

export const registry: Record<ModuleKey, () => JSX.Element> = {
  metrics: MetricsCard,
  notes: NotesCard,
  tasks: TasksCard,
} 