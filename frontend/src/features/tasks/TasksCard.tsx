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

const priorityColors: Record<Priority, string> = {
  L: 'border-green-300',
  M: 'border-yellow-300',
  H: 'border-red-300',
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
    <div className={`p-3 rounded border-l-4 ${priorityColors[task.priority]} ${task.done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => onToggle(task.id)}
          className="mt-1"
        />
        <div className="flex-1">
          <button
            className={`text-left w-full ${task.done ? 'line-through text-muted-foreground' : ''}`}
            onClick={() => onOpen(task)}
          >
            {task.content}
          </button>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-gray-100 rounded">
              {priorityLabels[task.priority]}
            </span>
            {task.due_date && (
              <span className={`px-2 py-1 rounded ${
                task.due_date === today ? 'bg-red-100 text-red-800' :
                task.due_date === tomorrow ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100'
              }`}>
                {formatDate(task.due_date)}
              </span>
            )}
            {employee && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                👤 {employee.name}
              </span>
            )}
            {project && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                📁 {project.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="text-blue-500 hover:text-blue-700 text-xs"
            onClick={() => onEdit(task)}
          >
            ✏️
          </button>
          <button
            className="text-red-500 hover:text-red-700 text-xs"
            onClick={() => onDelete(task.id)}
          >
            🗑️
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
    // fetchProjects()
  }, [fetchTasks, fetchEmployees])

  useEffect(() => {
    function onTitleClick(e: any) {
      if (e?.detail?.id === 'tasks') setHeaderDetailOpen(true)
    }
    window.addEventListener('module-title-click', onTitleClick as any)
    return () => window.removeEventListener('module-title-click', onTitleClick as any)
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  // Group tasks
  const { todayTasks, tomorrowTasks, futureTasks, pastTasks, completedTasks, noDueTasks } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const active = tasks.filter(t => !t.done)
    const completed = tasks
      .filter(t => t.done)
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || '').getTime()
        const bTime = new Date(b.updated_at || b.created_at || '').getTime()
        return bTime - aTime
      })
    const noDue = active.filter(t => !t.due_date)
    
    return {
      todayTasks: active.filter(t => t.due_date === today),
      tomorrowTasks: active.filter(t => t.due_date === tomorrow), 
      futureTasks: active.filter(t => t.due_date && t.due_date > tomorrow),
      pastTasks: active.filter(t => t.due_date && t.due_date < today),
      completedTasks: completed,
      noDueTasks: noDue,
    }
  }, [tasks])

  function resetForm() {
    setContent('')
    setPriority('M')
    setDue('')
    setAssignedTo('')
    setProjectId('')
    setEditingTask(null)
    setShowForm(false)
  }

  function startEdit(task: Task) {
    setEditingTask(task)
    setContent(task.content)
    setPriority(task.priority)
    setDue(task.due_date || '')
    setAssignedTo(task.assigned_to || '')
    setProjectId(task.project_id || '')
    setShowForm(true)
  }

  function openDetail(task: Task) {
    setDetailTask(task)
    setDetailOpen(true)
  }

  async function onSubmit() {
    if (!content.trim()) return
    
    const taskData = {
      content: content.trim(),
      priority,
      due_date: due || undefined,
      done: editingTask ? editingTask.done : false,
      assigned_to: assignedTo || undefined,
      project_id: projectId || undefined
    }

    try {
      if (editingTask) {
        await update(editingTask.id, taskData)
      } else {
        await add(taskData)
      }
      resetForm()
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  async function onDelete(taskId: string) {
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
    <ModuleCard id="tasks" title="Задачи" size="2x2">
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
          onClose={() => setDetailOpen(false)}
          onEdit={(t) => { startEdit(t); setDetailOpen(false) }}
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
          onStartEdit={(t) => { startEdit(t); setHeaderDetailOpen(false) }}
          onToggle={onToggle}
          onDelete={onDelete}
          onAdd={add}
        />

        <div className="flex items-center gap-2">
          <button
            className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Отмена' : 'Добавить задачу'}
          </button>
          {editingTask && (
            <span className="text-sm text-muted-foreground">Редактирование</span>
          )}
        </div>

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
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  >
                    <option value="L">Низкий</option>
                    <option value="M">Средний</option>
                    <option value="H">Высокий</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block">Срок</label>
                  <input
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Исполнитель</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  >
                    <option value="">Не назначен</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block">Проект</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  >
                    <option value="">Без проекта</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground"
                onClick={onSubmit}
              >
                {editingTask ? 'Сохранить' : 'Создать задачу'}
              </button>
              <button
                className="h-8 px-3 rounded border text-sm"
                onClick={resetForm}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-4">
            {todayTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-red-600">Сегодня ({todayTasks.length})</h4>
                <div className="space-y-2">
                  {todayTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      employees={employees}
                      projects={projects}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={startEdit}
                      onOpen={openDetail}
                    />
                  ))}
                </div>
              </div>
            )}

            {tomorrowTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-yellow-600">Завтра ({tomorrowTasks.length})</h4>
                <div className="space-y-2">
                  {tomorrowTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      employees={employees}
                      projects={projects}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={startEdit}
                      onOpen={openDetail}
                    />
                  ))}
                </div>
              </div>
            )}

            {futureTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-blue-600">Будущие ({futureTasks.length})</h4>
                <div className="space-y-2">
                  {futureTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      employees={employees}
                      projects={projects}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={startEdit}
                      onOpen={openDetail}
                    />
                  ))}
                </div>
              </div>
            )}

            {pastTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-500">Просроченные ({pastTasks.length})</h4>
                <div className="space-y-2">
                  {pastTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      employees={employees}
                      projects={projects}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={startEdit}
                      onOpen={openDetail}
                    />
                  ))}
                </div>
              </div>
            )}

            {noDueTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Без срока ({noDueTasks.length})</h4>
                <div className="space-y-2">
                  {noDueTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      employees={employees}
                      projects={projects}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={startEdit}
                      onOpen={openDetail}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-600">Выполненные ({completedTasks.length})</h4>
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      employees={employees}
                      projects={projects}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={startEdit}
                      onOpen={openDetail}
                    />
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