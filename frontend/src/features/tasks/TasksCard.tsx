import { ModuleCard } from '@/features/modules/ModuleCard'
import { useTasks } from '@/stores/useTasks'
import { useEmployees } from '@/stores/useEmployees'
import { useProjects } from '@/stores/useProjects'
import { formatDate } from '@/lib/format'
import { useMemo, useState, useEffect } from 'react'
import type { Task, Priority } from '@/types/core'
import { ConfirmDialog } from '@/app/ConfirmDialog'
import { TaskDetailDialog } from './TaskDetailDialog'
import { TaskBoardDialog } from './TaskBoardDialog'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import { DatePicker } from '@/components/DatePicker'
import { Select } from '@/components/Select'
import { Checkbox } from '@/components/ui/checkbox'

const priorityColors: Record<Priority, string> = {
  L: 'border-green-300 dark:border-green-500/50 shadow-[0_0_0_1px_rgba(34,197,94,0.15)]',
  M: 'border-yellow-300 dark:border-yellow-500/50 shadow-[0_0_0_1px_rgba(234,179,8,0.15)]',
  H: 'border-red-300 dark:border-red-500/50 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]',
}

const priorityLabels: Record<Priority, string> = {
  L: 'Низкий',
  M: 'Средний',
  H: 'Высокий',
}

interface TaskItemProps {
  task: Task
  employees: any[]
  projects: any[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  onOpen: (task: Task) => void
}

function TaskItem({ task, employees, projects, onToggle, onDelete, onEdit, onOpen }: TaskItemProps) {
  const employee = task.assigned_to ? employees.find(e => e.id === task.assigned_to) : null
  const project = task.project_id ? projects.find(p => p.id === task.project_id) : null
  
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  
  return (
    <div className={`p-3 rounded border-l-4 border-r-4 ${priorityColors[task.priority]} ${task.done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={task.done} onCheckedChange={() => onToggle(task.id)} className="mt-0.5" />
        <div className="flex-1">
          <button
            className={`text-left w-full ${task.done ? 'line-through text-muted-foreground' : ''}`}
            onClick={() => onOpen(task)}
          >
            {task.content}
          </button>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20">
              {priorityLabels[task.priority]}
            </span>
            {task.due_date && (
              <span className={`px-2 py-1 rounded ${
                task.due_date === today
                  ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 dark:ring-1 dark:ring-red-500/20'
                  : task.due_date === tomorrow
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-1 dark:ring-yellow-500/20'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-1 dark:ring-gray-500/20'
              }`}>
                {formatDate(task.due_date)}
              </span>
            )}
            {employee && (
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20">
                👤 {employee.name}
              </span>
            )}
            {project && (
              <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-1 dark:ring-purple-500/20">
                📁 {project.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
            onClick={() => onEdit(task)}
            title="Редактировать"
            aria-label="Редактировать"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
            onClick={() => onDelete(task.id)}
            title="Удалить"
            aria-label="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function TasksCard() {
  const tasks = useTasks((s) => s.tasks)
  const add = useTasks((s) => s.add)
  const toggle = useTasks((s) => s.toggle)
  const update = useTasks((s) => s.update)
  const remove = useTasks((s) => s.remove)
  const fetchTasks = useTasks((s) => s.fetchTasks)
  const employees = useEmployees((s) => s.employees)
  const fetchEmployees = useEmployees((s) => s.fetchEmployees)
  const projects = useProjects((s) => s.projects)

  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<Priority>('M')
  const [due, setDue] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [projectId, setProjectId] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [headerDetailOpen, setHeaderDetailOpen] = useState(false)

  // Load data on mount
  useEffect(() => {
    fetchTasks()
    fetchEmployees()
  }, [fetchTasks, fetchEmployees])

  // Open TaskBoardDialog by header title click
  useEffect(() => {
    function onTitleClick(e: any) {
      if (e?.detail?.id === 'tasks') setHeaderDetailOpen(true)
    }
    window.addEventListener('module-title-click', onTitleClick as any)
    return () => window.removeEventListener('module-title-click', onTitleClick as any)
  }, [])

  const employeesById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const projectsById = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  // Group tasks into sections
  const { overdue, todayList, tomorrowList, future, noDue, completed } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    const active = tasks.filter(t => !t.done)
    const completed = tasks.filter(t => t.done).slice().sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || '').getTime()
      const bTime = new Date(b.updated_at || b.created_at || '').getTime()
      return bTime - aTime
    })

    const overdue = active.filter(t => t.due_date && t.due_date < today)
    const todayList = active.filter(t => t.due_date === today)
    const tomorrowList = active.filter(t => t.due_date === tomorrow)
    const future = active.filter(t => t.due_date && t.due_date > tomorrow)
    const noDue = active.filter(t => !t.due_date)

    // sort active groups by due date asc within each
    const byDueAsc = (a: Task, b: Task) => (a.due_date || '').localeCompare(b.due_date || '')
    overdue.sort(byDueAsc)
    todayList.sort(byDueAsc)
    tomorrowList.sort(byDueAsc)
    future.sort(byDueAsc)

    return { overdue, todayList, tomorrowList, future, noDue, completed }
  }, [tasks])

  function onStartEdit(task: Task) {
    setEditingTask(task)
    setShowForm(true)
    setContent(task.content)
    setPriority(task.priority)
    setDue(task.due_date || '')
    setAssignedTo(task.assigned_to || '')
    setProjectId(task.project_id || '')
  }

  function onDelete(taskId: string) {
    setPendingDeleteId(taskId)
    setConfirmOpen(true)
  }

  async function onToggle(taskId: string) {
    try {
      await toggle(taskId)
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  return (
    <ModuleCard
      id="tasks"
      title="Задачи"
      size="2x2"
      headerActions={
        <button
          className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40"
          onClick={() => {
            setShowForm((prev) => {
              const next = !prev
              if (next) {
                setEditingTask(null)
                setContent('')
                setPriority('M')
                setDue('')
                setAssignedTo('')
                setProjectId('')
              }
              return next
            })
          }}
        >
          {showForm ? (<><X className="h-4 w-4" /> Отмена</>) : (<><Plus className="h-4 w-4" /> Добавить</>)}
        </button>
      }
    >
      <div className="flex flex-col gap-4 h-full min-h-0">
        <ConfirmDialog
          open={confirmOpen}
          title="Удалить задачу?"
          description="Это действие нельзя отменить. Задача будет удалена."
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null) }}
          onConfirm={async () => {
            if (pendingDeleteId) {
              try { await remove(pendingDeleteId) } catch {}
            }
            setConfirmOpen(false)
            setPendingDeleteId(null)
          }}
        />

        <TaskDetailDialog
          open={detailOpen}
          task={detailTask}
          employeeName={detailTask?.assigned_to ? employees.find(e => e.id === detailTask?.assigned_to)?.name ?? null : null}
          projectName={detailTask?.project_id ? projects.find(p => p.id === detailTask?.project_id)?.name ?? null : null}
          inline={true}
          onClose={() => setDetailOpen(false)}
          onEdit={(t) => { onStartEdit(t); setDetailOpen(false) }}
          onToggle={(id) => onToggle(id)}
          onDelete={(id) => { setDetailOpen(false); onDelete(id) }}
        />

        <TaskBoardDialog
          open={headerDetailOpen}
          tasks={tasks}
          employees={employees}
          projects={projects}
          onClose={() => setHeaderDetailOpen(false)}
          onOpenDetail={(t) => { setDetailTask(t); setDetailOpen(true); }}
          onStartEdit={(t) => { onStartEdit(t); setHeaderDetailOpen(false) }}
          onToggle={onToggle}
          onDelete={onDelete}
          onAdd={add}
        />

        {editingTask && (
          <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Редактирование</span></div>
        )}

        {showForm && (
          <div className="p-3 border rounded bg-muted/10">
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block">Задача *</label>
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="Что нужно сделать..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block">Приоритет</label>
                  <Select
                    value={priority}
                    onChange={(v) => setPriority(v as Priority)}
                    options={[
                      { value: 'L', label: 'Низкий' },
                      { value: 'M', label: 'Средний' },
                      { value: 'H', label: 'Высокий' },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Срок</label>
                  <DatePicker value={due} onChange={setDue} className="h-8" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block">Исполнитель</label>
                  <Select
                    value={assignedTo}
                    onChange={setAssignedTo}
                    options={[{ value: '', label: 'Не выбран' }, ...Object.values(employeesById).map((e: any) => ({ value: e.id, label: e.name }))]}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Проект</label>
                  <Select
                    value={projectId}
                    onChange={setProjectId}
                    options={[{ value: '', label: 'Не выбран' }, ...Object.values(projectsById).map((p: any) => ({ value: p.id, label: p.name }))]}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="h-8 px-3 rounded border text-sm hover:bg-muted/40" onClick={async () => {
                  if (!content.trim()) return
                  if (editingTask) {
                    await update(editingTask.id, { content: content.trim(), priority, due_date: due || undefined, assigned_to: assignedTo || undefined, project_id: projectId || undefined })
                    setEditingTask(null)
                  } else {
                    await add({ content: content.trim(), priority, due_date: due || undefined, done: false, assigned_to: assignedTo || undefined, project_id: projectId || undefined, created_at: undefined as any, updated_at: undefined as any } as any)
                  }
                  setContent(''); setDue(''); setAssignedTo(''); setProjectId(''); setShowForm(false)
                }}>Сохранить</button>
                <button className="h-8 px-3 rounded border text-sm hover:bg-muted/40" onClick={() => { setEditingTask(null); setContent(''); setDue(''); setAssignedTo(''); setProjectId(''); setShowForm(false) }}>Отмена</button>
              </div>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto relative">
          <div className="space-y-6">
            {overdue.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-red-600">Истекшие ({overdue.length})</h4>
                <div className="space-y-2">
                  {overdue.map(t => (
                    <TaskItem key={t.id} task={t} employees={employees} projects={projects} onToggle={onToggle} onDelete={(id) => onDelete(id)} onEdit={(task) => onStartEdit(task)} onOpen={(task) => { setDetailTask(task); setDetailOpen(true) }} />
                  ))}
                </div>
              </div>
            )}

            {todayList.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Сегодня ({todayList.length})</h4>
                <div className="space-y-2">
                  {todayList.map(t => (
                    <TaskItem key={t.id} task={t} employees={employees} projects={projects} onToggle={onToggle} onDelete={(id) => onDelete(id)} onEdit={(task) => onStartEdit(task)} onOpen={(task) => { setDetailTask(task); setDetailOpen(true) }} />
                  ))}
                </div>
              </div>
            )}

            {tomorrowList.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Завтра ({tomorrowList.length})</h4>
                <div className="space-y-2">
                  {tomorrowList.map(t => (
                    <TaskItem key={t.id} task={t} employees={employees} projects={projects} onToggle={onToggle} onDelete={(id) => onDelete(id)} onEdit={(task) => onStartEdit(task)} onOpen={(task) => { setDetailTask(task); setDetailOpen(true) }} />
                  ))}
                </div>
              </div>
            )}

            {future.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Будущие ({future.length})</h4>
                <div className="space-y-2">
                  {future.map(t => (
                    <TaskItem key={t.id} task={t} employees={employees} projects={projects} onToggle={onToggle} onDelete={(id) => onDelete(id)} onEdit={(task) => onStartEdit(task)} onOpen={(task) => { setDetailTask(task); setDetailOpen(true) }} />
                  ))}
                </div>
              </div>
            )}

            {noDue.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Без срока ({noDue.length})</h4>
                <div className="space-y-2">
                  {noDue.map(t => (
                    <TaskItem key={t.id} task={t} employees={employees} projects={projects} onToggle={onToggle} onDelete={(id) => onDelete(id)} onEdit={(task) => onStartEdit(task)} onOpen={(task) => { setDetailTask(task); setDetailOpen(true) }} />
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-600">Выполненные ({completed.length})</h4>
                <div className="space-y-2">
                  {completed.map(t => (
                    <TaskItem key={t.id} task={t} employees={employees} projects={projects} onToggle={onToggle} onDelete={(id) => onDelete(id)} onEdit={(task) => onStartEdit(task)} onOpen={(task) => { setDetailTask(task); setDetailOpen(true) }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleCard>
  )
} 