import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, Priority } from '@/types/core'
import { Pencil, Clock, Calendar, User, FolderOpen, Pause, Play } from 'lucide-react'

interface KanbanCardProps {
  task: Task
  employees: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  onTaskClick: (task: Task) => void
  onTaskEdit: (task: Task) => void
  isAdmin: boolean
  isDragging?: boolean
}

// Маппинг приоритетов для отображения
const priorityConfig: Record<Priority, { label: string; color: string }> = {
  H: { label: 'Высокий', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  M: { label: 'Средний', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  L: { label: 'Низкий', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
}

export function KanbanCard({ 
  task, 
  employees, 
  projects, 
  onTaskClick, 
  onTaskEdit, 
  isAdmin,
  isDragging = false
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Находим данные сотрудника и проекта
  const assignedEmployee = task.assigned_to ? employees.find(e => e.id === task.assigned_to) : null
  const taskProject = task.project_id ? projects.find(p => p.id === task.project_id) : null
  
  // Определяем состояние дедлайна
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = task.due_date && task.due_date < today && !task.done
  const isDueToday = task.due_date === today
  
  // Стили для карточки
  const cardClasses = `
    bg-background border rounded-lg p-3 shadow-sm cursor-pointer
    hover:shadow-md transition-shadow duration-200
    ${isDragging || isSortableDragging ? 'opacity-50 rotate-3 shadow-lg' : ''}
    ${isOverdue ? 'border-red-200 dark:border-red-800' : ''}
    ${isDueToday ? 'border-orange-200 dark:border-orange-800' : ''}
  `.trim()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cardClasses}
      onClick={() => onTaskClick(task)}
    >
      {/* Заголовок задачи */}
      <div className="mb-2">
        <p className="text-sm font-medium line-clamp-2 break-words">
          {task.content}
        </p>
      </div>
      
      {/* Метаданные задачи */}
      <div className="space-y-2">
        {/* Рабочий статус */}
        {!task.done && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.work_status === 'in_progress' ? (
              <>
                <Play className="h-3 w-3" /> В работе
              </>
            ) : task.work_status === 'paused' ? (
              <>
                <Pause className="h-3 w-3" /> На паузе
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-slate-400" /> Открытая
              </>
            )}
          </div>
        )}
        {/* Приоритет */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig[task.priority].color}`}>
            {priorityConfig[task.priority].label}
          </span>
          
          {/* Часы работы */}
          {task.hours_spent > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.hours_spent}ч
            </div>
          )}
        </div>
        
        {/* Дедлайн */}
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${
            isOverdue ? 'text-red-600 dark:text-red-400' : 
            isDueToday ? 'text-orange-600 dark:text-orange-400' : 
            'text-muted-foreground'
          }`}>
            <Calendar className="h-3 w-3" />
            {task.due_date}
            {isOverdue && ' (просрочено)'}
            {isDueToday && ' (сегодня)'}
          </div>
        )}
        
        {/* Исполнитель */}
        {assignedEmployee && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {assignedEmployee.name}
          </div>
        )}
        
        {/* Проект */}
        {taskProject && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FolderOpen className="h-3 w-3" />
            {taskProject.name}
          </div>
        )}
        
        {/* Статус подтверждения */}
        {task.done && task.approved === false && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Ожидает подтверждения
          </div>
        )}
      </div>
    </div>
  )
}
