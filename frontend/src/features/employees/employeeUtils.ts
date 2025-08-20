import type { Employee, Project, Task, Transaction } from '@/types/core'

export interface EmployeeStats {
  totalHours: number
  totalRevenue: number
  totalSalaryCost: number
  activeProjects: Project[]
  completedTasks: number
  inProgressTasks: number
  actualHourlyRate: number // Реальная стоимость часа работы (ЗП/часы)
  revenuePerHour: number // Доходность в час
  profitMargin: number
}

export function calculateEmployeeStats(
  employee: Employee,
  projects: Project[],
  tasks: Task[],
  transactions: Transaction[]
): EmployeeStats {
  // Найти проекты, в которых участвует сотрудник
  const employeeProjects = projects.filter(project => 
    project.member_ids.includes(employee.id) && project.status === 'active'
  )

  // Найти задачи сотрудника
  const employeeTasks = tasks.filter(task => task.assigned_to === employee.id)
  const completedTasks = employeeTasks.filter(task => task.done).length
  const inProgressTasks = employeeTasks.filter(task => !task.done).length

  // Подсчитать общее количество часов
  const totalHours = employeeTasks.reduce((sum, task) => sum + task.hours_spent, 0)

  // Подсчитать доходы и расходы связанные с сотрудником только из транзакций
  const employeeTransactions = transactions.filter(tx => tx.employee_id === employee.id)
  const revenue = employeeTransactions
    .filter(tx => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)
  
  const salaryCosts = employeeTransactions
    .filter(tx => tx.transaction_type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Используем только данные из транзакций
  const totalRevenue = revenue
  const totalSalaryCost = salaryCosts

  // Подсчитать реальную стоимость часа работы (расходы на ЗП / часы)
  const actualHourlyRate = totalHours > 0 ? totalSalaryCost / totalHours : 0

  // Подсчитать доходность в час (сколько прибыли приносит час работы)
  const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0

  // Подсчитать маржу прибыли
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSalaryCost) / totalRevenue) * 100 : 0

  return {
    totalHours,
    totalRevenue,
    totalSalaryCost,
    activeProjects: employeeProjects,
    completedTasks,
    inProgressTasks,
    actualHourlyRate,
    revenuePerHour,
    profitMargin
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} мин`
  }
  return `${hours.toFixed(1)} ч`
}
