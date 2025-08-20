import { useMemo, useState, useEffect, useRef } from 'react'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection
} from '@dnd-kit/core'
import { 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { useTasks } from '@/stores/useTasks'
import { useEmployees } from '@/stores/useEmployees'
import { useProjects } from '@/stores/useProjects'
import { useAuth } from '@/stores/useAuth'
import type { Task, TaskWorkStatus } from '@/types/core'
import { KanbanColumn } from '@/features/tasks/KanbanColumn'
import { KanbanCard } from '@/features/tasks/KanbanCard'
import { TaskDetailDialog } from '@/features/tasks/TaskDetailDialog'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { ArrowLeft, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Определение всех возможных статусов задач для Kanban board
 * 
 * Колонки Kanban:
 * 1. Открытые - новые задачи без работы
 * 2. В работе - задачи в процессе выполнения 
 * 3. На паузе - приостановленные задачи
 * 4. Ожидают подтверждения - выполненные, но не подтвержденные
 * 5. Выполненные - полностью завершенные задачи
 */
export type KanbanStatus = 'open' | 'in_progress' | 'paused' | 'awaiting_approval' | 'completed'

interface KanbanColumn {
  id: KanbanStatus
  title: string
  color: string
}

// Конфигурация колонок Kanban board
const kanbanColumns: KanbanColumn[] = [
  { id: 'open', title: 'Открытые', color: 'bg-slate-100 dark:bg-slate-700' },
  { id: 'in_progress', title: 'В работе', color: 'bg-blue-100 dark:bg-blue-800' },
  { id: 'paused', title: 'На паузе', color: 'bg-yellow-100 dark:bg-yellow-800' },
  { id: 'awaiting_approval', title: 'Ожидают подтверждения', color: 'bg-orange-100 dark:bg-orange-800' },
  { id: 'completed', title: 'Выполненные', color: 'bg-green-100 dark:bg-green-800' }
]

/**
 * Функция для определения статуса Kanban на основе данных задачи
 */
function getTaskKanbanStatus(task: Task): KanbanStatus {
  // Выполненные задачи: различаем по approved
  if (task.done) {
    if (task.approved === true) return 'completed'
    return 'awaiting_approval'
  }

  // Активные задачи: по рабочему статусу
  if (task.work_status === 'in_progress') return 'in_progress'
  if (task.work_status === 'paused') return 'paused'

  // По умолчанию - открытая задача
  return 'open'
}

/**
 * Функция для обновления задачи на основе нового статуса Kanban
 */
function updateTaskFromKanbanStatus(task: Task, newStatus: KanbanStatus): Partial<Task> {
  const updates: Partial<Task> = {}
  
  switch (newStatus) {
    case 'open':
      // Возвращаем задачу в открытое состояние
      updates.done = false
      updates.work_status = null
      // Явно сбросим approved, чтобы не висела как awaiting
      updates.approved = false
      break
      
    case 'in_progress':
      // Ставим задачу в работу
      updates.done = false
      updates.work_status = 'in_progress'
      updates.approved = false
      break
      
    case 'paused':
      // Ставим задачу на паузу
      updates.done = false  
      updates.work_status = 'paused'
      updates.approved = false
      break
      
    case 'awaiting_approval':
      // Завершаем задачу, но ставим на ожидание подтверждения
      updates.done = true
      updates.work_status = null // Очищаем рабочий статус при завершении
      updates.approved = false
      break
      
    case 'completed':
      // Полностью завершаем задачу
      updates.done = true
      updates.work_status = null // Очищаем рабочий статус при завершении
  updates.approved = true
      break
      
    default:
      console.error('Unknown Kanban status:', newStatus)
      return {}
  }
  
  console.log(`Updating task to ${newStatus}:`, updates)
  return updates
}

export function KanbanPage() {
  const { tasks, loading, update: updateTask, add: addTask } = useTasks()
  const { employees } = useEmployees()
  const { projects } = useProjects()
  const user = useAuth((s) => s.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'owner'
  
  // Состояние для диалогов
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  // Состояние для drag and drop
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  // Запоминаем последнюю колонку, над которой был курсор во время DnD (для случаев, когда over.id === active.id)
  const lastOverColumnRef = useRef<KanbanStatus | null>(null)
  const lastOverTaskIdRef = useRef<string | null>(null)
  // Оптимистичные статусы во время DnD, чтобы избежать визуальной задержки
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, KanbanStatus>>({})

  // Локальный порядок задач в колонках
  const [orderMap, setOrderMap] = useState<Record<KanbanStatus, string[]>>({
    open: [], in_progress: [], paused: [], awaiting_approval: [], completed: []
  })
  
  // Состояние для скрытых колонок
  const [hiddenColumns, setHiddenColumns] = useState<Set<KanbanStatus>>(new Set())
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  
  // Настройка сенсоров для drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Требуется минимальное перемещение для активации
      },
    })
  )

  // Кастомная стратегия коллизий: предпочитаем карточки задач, колонки — фоллбек
  const collisionDetection: CollisionDetection = (args) => {
    // 1) Пытаемся найти цели под курсором
    let collisions = pointerWithin(args)
    if (!collisions.length) {
      // 2) Фоллбек — ближайшие углы, когда курсор вне областей
      collisions = closestCorners(args)
    }

    // Убираем сам перетаскиваемый элемент
    const filtered = collisions.filter(c => c.id !== args.active.id)
    if (!filtered.length) return filtered

    // Предпочитаем совпадения по карточкам задач
    const taskIdSet = new Set(tasks.map(t => t.id))
    const taskHits = filtered.filter(c => taskIdSet.has(String(c.id)))
    if (taskHits.length) return taskHits

    // Если карточек нет под указателем — допускаем колонки
    const columnIds = new Set<KanbanStatus>(kanbanColumns.map(c => c.id))
    const columnHits = filtered.filter(c => columnIds.has(String(c.id) as KanbanStatus))
    if (columnHits.length) return columnHits

    // В остальных случаях вернем что есть
    return filtered
  }
  
  // Группировка задач по статусам Kanban
  const tasksByStatus = useMemo(() => {
    const grouped: Record<KanbanStatus, Task[]> = {
      open: [],
      in_progress: [],
      paused: [],
      awaiting_approval: [],
      completed: []
    }
    
    for (const task of tasks) {
      // Используем оптимистичный статус, если он установлен
      const status = optimisticStatus[task.id] ?? getTaskKanbanStatus(task)
      grouped[status].push(task)
    }
    
    // Применяем локальный порядок из orderMap: сначала те, что в списке, затем остальные
    (Object.keys(grouped) as KanbanStatus[]).forEach((col: KanbanStatus) => {
      const order: string[] = orderMap[col] || []
      const orderIndex = new Map<string, number>(order.map((id: string, idx: number) => [id, idx]))
      grouped[col].sort((a: Task, b: Task) => {
        const ia = orderIndex.has(a.id) ? (orderIndex.get(a.id) as number) : Number.MAX_SAFE_INTEGER
        const ib = orderIndex.has(b.id) ? (orderIndex.get(b.id) as number) : Number.MAX_SAFE_INTEGER
        if (ia !== ib) return ia - ib
        // стабильная сортировка по дате как вторичный ключ
        return (a.created_at || '').localeCompare(b.created_at || '')
      })
    })
    
    return grouped
  }, [tasks, orderMap, optimisticStatus])

  // Синхронизация orderMap при изменении задач: добавляем новые id в конец своих колонок, удаляем отсутствующие
  useEffect(() => {
    setOrderMap((prev) => {
      const next: Record<KanbanStatus, string[]> = { open: [], in_progress: [], paused: [], awaiting_approval: [], completed: [] }
      ;(Object.keys(next) as KanbanStatus[]).forEach((col) => {
        const ids = tasks.filter(t => getTaskKanbanStatus(t) === col).map(t => t.id)
        const existing = prev[col] || []
        // сохраняем относительный порядок для пересечения
        const kept = existing.filter(id => ids.includes(id))
        const missing = ids.filter(id => !kept.includes(id))
        next[col] = [...kept, ...missing]
      })
      return next
    })
  }, [tasks])
  
  // Обработка начала перетаскивания
  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }
  
  // Отслеживаем колонку под курсором во время перетаскивания
  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (!over) return
    let overColumn: KanbanStatus | null = null
    if (kanbanColumns.find(col => col.id === over.id)) {
      overColumn = over.id as KanbanStatus
    } else {
      const overTask = tasks.find(t => t.id === over.id)
      if (overTask) {
        overColumn = getTaskKanbanStatus(overTask)
      }
    }
    if (overColumn) {
      lastOverColumnRef.current = overColumn
    }
  // Сохраняем последнюю наведённую карточку (если цель — задача)
  const isTaskId = tasks.some(t => t.id === over.id)
  lastOverTaskIdRef.current = isTaskId ? String(over.id) : null
  }
  
  // Обработка окончания перетаскивания
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    console.log('Drag end event:', { 
      activeId: active.id, 
      overId: over?.id,
      activeData: active.data.current,
      overData: over?.data.current
    })
    
    setActiveTask(null)
    
    if (!over) {
      console.log('No drop target found')
      return
    }
    
    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) {
      console.error('Dragged task not found:', taskId)
      return
    }
    
    let newColumnId: string | null = null
    
  // Определяем целевую колонку
    if (kanbanColumns.find(col => col.id === over.id)) {
      // Перетащили прямо на колонку
      newColumnId = over.id as string
    } else {
      // Перетащили на карточку - найдем её колонку
      const targetTask = tasks.find(t => t.id === over.id)
      if (targetTask) {
        newColumnId = getTaskKanbanStatus(targetTask)
      }
    }
    
    // Если не удалось определить колонку (или over указывает на саму карточку), используем последнюю наведённую колонку
    if (!newColumnId || newColumnId === taskId) {
      newColumnId = lastOverColumnRef.current
    }

    if (!newColumnId || !kanbanColumns.find(col => col.id === newColumnId)) {
      console.error('Invalid drop target:', newColumnId)
      return
    }
    
    const currentStatus = getTaskKanbanStatus(task)
    const newStatus = newColumnId as KanbanStatus
    
    console.log('Status transition:', { 
      from: currentStatus, 
      to: newStatus,
      taskId: taskId,
      taskContent: task.content
    })
    
  if (currentStatus === newStatus) {
      // Перемещение в пределах одной колонки (reorder)
      const base = (orderMap[newStatus] && orderMap[newStatus].length ? orderMap[newStatus] : tasksByStatus[newStatus].map(t => t.id))
      const overTaskId = (over && tasks.some(t => t.id === over.id)) ? String(over.id) : lastOverTaskIdRef.current

      // Если нет валидной цели — считаем, что бросили на колонку => в конец
      if (!overTaskId || overTaskId === taskId) {
        const filtered = base.filter(id => id !== taskId)
        const next = [...filtered, taskId]
        setOrderMap((prev) => ({ ...prev, [newStatus]: next }))
        return
      }

      // Считаем позицию вставки относительно середины целевой карточки
      const filtered = base.filter(id => id !== taskId)
      const overIdxInFiltered = filtered.indexOf(overTaskId)
      if (overIdxInFiltered === -1) {
        const next = [...filtered, taskId]
        setOrderMap((prev) => ({ ...prev, [newStatus]: next }))
        return
      }

      // Определяем вставку до/после по положению активной карточки
      // Используем прямоугольники, если доступны; иначе вставляем до
  const aRectTop = (event.active.rect as any)?.current?.translated?.top ?? (event.active.rect as any)?.current?.top
  const oRect = (over as any)?.rect as any
      const overMidY = oRect?.top != null && oRect?.height != null ? (oRect.top + oRect.height / 2) : null
      const insertAfter = overMidY != null && aRectTop != null ? aRectTop > overMidY : false
      const insertIndex = overIdxInFiltered + (insertAfter ? 1 : 0)

      const next = [...filtered]
      next.splice(insertIndex, 0, taskId)
      setOrderMap((prev) => ({ ...prev, [newStatus]: next }))
      return
    }
    
    // Валидация статуса
    const validStatuses: KanbanStatus[] = ['open', 'in_progress', 'paused', 'awaiting_approval', 'completed']
    if (!validStatuses.includes(newStatus)) {
      console.error('Invalid target status:', newStatus)
      return
    }
    
    console.log(`Moving task ${taskId} from ${currentStatus} to ${newStatus}`)

    // Обновляем задачу в соответствии с новым статусом
    const updates = updateTaskFromKanbanStatus(task, newStatus)

    if (Object.keys(updates).length === 0) {
      console.error('No updates generated for status transition')
      return
    }

    console.log('Applying updates (optimistic UI):', updates)

  // Сохраним предыдущий порядок для возможного отката
  const prevSrc = (orderMap[currentStatus] && orderMap[currentStatus].length ? orderMap[currentStatus] : tasksByStatus[currentStatus].map(t => t.id))
  const prevDst = (orderMap[newStatus] && orderMap[newStatus].length ? orderMap[newStatus] : tasksByStatus[newStatus].map(t => t.id))

    // Оптимистично переносим карточку сразу в UI
    setOptimisticStatus(prev => ({ ...prev, [taskId]: newStatus }))
    setOrderMap((prev) => {
      const nextSrc = prevSrc.filter(id => id !== taskId)
      const nextDstBase = prevDst.filter(id => id !== taskId)

      // Определяем, на какую карточку навели в целевой колонке
      const overTaskId = (over && tasks.some(t => t.id === over.id)) ? String(over.id) : lastOverTaskIdRef.current
      if (!overTaskId) {
        // Бросили на колонку — добавляем в конец
        return { ...prev, [currentStatus]: nextSrc, [newStatus]: [...nextDstBase, taskId] }
      }

      const overIdx = nextDstBase.indexOf(overTaskId)
      if (overIdx === -1) {
        // На всякий случай — если целевая карточка не в списке (рассинхрон)
        return { ...prev, [currentStatus]: nextSrc, [newStatus]: [...nextDstBase, taskId] }
      }

      // Вставка до/после в целевой колонке
  const aRectTop = (event.active.rect as any)?.current?.translated?.top ?? (event.active.rect as any)?.current?.top
  const oRect = (over as any)?.rect as any
      const overMidY = oRect?.top != null && oRect?.height != null ? (oRect.top + oRect.height / 2) : null
      const insertAfter = overMidY != null && aRectTop != null ? aRectTop > overMidY : false
      const insertIndex = overIdx + (insertAfter ? 1 : 0)

      const nextDst = [...nextDstBase]
      nextDst.splice(insertIndex, 0, taskId)
      return { ...prev, [currentStatus]: nextSrc, [newStatus]: nextDst }
    })

    try {
      await updateTask(taskId, updates)
      console.log('Task updated successfully')
      // Refresh finance if task was completed and approved (admin action)
      try {
        if (newStatus === 'completed' || updates.done === true) {
          const mod = await import('@/stores/useFinance')
          mod.useFinance.getState().fetch().catch(() => {})
        }
      } catch {}
      // Убираем оптимистичный оверрайд — задача уже обновлена на сервере
      setOptimisticStatus(prev => {
        const { [taskId]: _, ...rest } = prev
        return rest
      })
    } catch (error) {
      console.error('Failed to update task status:', error)
      // Откатим изменения в UI
      setOptimisticStatus(prev => {
        const { [taskId]: _, ...rest } = prev
        return rest
      })
      setOrderMap((prev) => ({ ...prev, [currentStatus]: prevSrc, [newStatus]: prevDst }))
    } finally {
      // Сбрасываем запомненную колонку после завершения DnD
      lastOverColumnRef.current = null
      lastOverTaskIdRef.current = null
    }
  }
  
  // Открытие деталей задачи
  function openTaskDetail(task: Task) {
    setDetailTask(task)
    setDetailOpen(true)
  }
  
  // Редактирование задачи
  function editTask(task: Task) {
    setEditingTask(task)
    setFormOpen(true)
  }
  
  // Создание новой задачи отключено на этой странице
  
  // Функции управления колонками
  function toggleColumnVisibility(columnId: KanbanStatus) {
    setHiddenColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnId)) {
        newSet.delete(columnId)
      } else {
        newSet.add(columnId)
      }
      return newSet
    })
  }
  
  function showAllColumns() {
    setHiddenColumns(new Set())
  }
  
  function hideEmptyColumns() {
    const emptyColumns = kanbanColumns
      .filter(col => tasksByStatus[col.id].length === 0)
      .map(col => col.id)
    setHiddenColumns(new Set(emptyColumns))
  }
  
  // Фильтруем видимые колонки
  const visibleColumns = kanbanColumns.filter(col => !hiddenColumns.has(col.id))
  
  // Закрываем выпадающий список при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showColumnSettings && !(event.target as Element)?.closest('.column-settings')) {
        setShowColumnSettings(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColumnSettings])
  
  return (
    <div className="h-full flex flex-col">
      {/* Заголовок страницы */}
  <div className="flex items-center justify-between px-3 py-1 bg-background">
        <div className="flex items-center gap-2">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к дашборду
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Управление колонками */}
          <div className="relative column-settings">
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted/40"
            >
              <Settings className="h-4 w-4" />
              Колонки
            </button>
            
            {showColumnSettings && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-background border rounded-lg shadow-lg z-10">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Управление колонками</h3>
                    <button
                      onClick={() => setShowColumnSettings(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {kanbanColumns.map(column => (
                      <label key={column.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.has(column.id)}
                          onChange={() => toggleColumnVisibility(column.id)}
                          className="rounded"
                        />
                        <span className="flex-1">{column.title}</span>
                        <span className="text-xs text-muted-foreground">
                          ({tasksByStatus[column.id].length})
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={showAllColumns}
                      className="flex-1 px-2 py-1 text-xs border rounded hover:bg-muted/40"
                    >
                      Показать все
                    </button>
                    <button
                      onClick={hideEmptyColumns}
                      className="flex-1 px-2 py-1 text-xs border rounded hover:bg-muted/40"
                    >
                      Скрыть пустые
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
      
      {/* Kanban Board */}
  <div className="flex-1 p-3 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={`grid gap-6 h-full ${
            visibleColumns.length === 1 ? 'grid-cols-1' :
            visibleColumns.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            visibleColumns.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            visibleColumns.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
          }`}>
            {visibleColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                tasks={tasksByStatus[column.id]}
                employees={employees}
                projects={projects}
                onTaskClick={openTaskDetail}
                onTaskEdit={editTask}
                isAdmin={isAdmin}
              />
            ))}
            
            {visibleColumns.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Все колонки скрыты</p>
                <p className="text-sm mb-4">Используйте кнопку "Колонки" чтобы показать нужные колонки</p>
                <button
                  onClick={showAllColumns}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Показать все колонки
                </button>
              </div>
            )}
          </div>
          
          {/* Overlay для перетаскиваемого элемента */}
          <DragOverlay>
            {activeTask ? (
              <KanbanCard
                task={activeTask}
                employees={employees}
                projects={projects}
                onTaskClick={() => {}}
                onTaskEdit={() => {}}
                isAdmin={isAdmin}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      
      {/* Диалоги */}
      <TaskDetailDialog
        open={detailOpen}
        task={detailTask}
        employeeName={detailTask?.assigned_to ? employees.find(e => e.id === detailTask?.assigned_to)?.name ?? null : null}
        projectName={detailTask?.project_id ? projects.find(p => p.id === detailTask?.project_id)?.name ?? null : null}
        employees={employees}
        projects={projects}
        onClose={() => setDetailOpen(false)}
        onEdit={editTask}
        onToggle={() => {}}
        onDelete={() => {}}
      />
      
      {formOpen && (
        <TaskFormDialog
          open={formOpen}
          task={editingTask}
          employees={employees}
          projects={projects}
          onClose={() => setFormOpen(false)}
          onSave={async (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
            if (editingTask) {
              await updateTask(editingTask.id, data)
            } else {
              await addTask(data)
            }
            setFormOpen(false)
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
