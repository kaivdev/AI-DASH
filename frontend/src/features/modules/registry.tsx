import { MetricsCard } from '@/features/metrics/MetricsCard'
import { NotesCard } from '@/features/notes/NotesCard'
import { TasksCard } from '@/features/tasks/TasksCard'
import { FinanceCard } from '@/features/finance/FinanceCard'
import { EmployeesCard } from '@/features/employees/EmployeesCard'
import { ProjectsCard } from '@/features/projects/ProjectsCard'
import { GoalsCard } from '@/features/goals/GoalsCard'
import { ReadingListCard } from '@/features/reading/ReadingListCard'

export type ModuleKey = 'metrics' | 'notes' | 'tasks' | 'finance' | 'employees' | 'projects' | 'goals' | 'reading'

export const registry: Record<ModuleKey, () => JSX.Element> = {
  metrics: MetricsCard,
  notes: NotesCard,
  tasks: TasksCard,
  finance: FinanceCard,
  employees: EmployeesCard,
  projects: ProjectsCard,
  goals: GoalsCard,
  reading: ReadingListCard,
} 