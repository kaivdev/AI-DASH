import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task } from '@/types/core'
import { KanbanCard } from '@/features/tasks/KanbanCard'

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  tasks: Task[]
  employees: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  onTaskClick: (task: Task) => void
  onTaskEdit: (task: Task) => void
  isAdmin: boolean
}

export function KanbanColumn({ 
  id, 
  title, 
  color, 
  tasks, 
  employees, 
  projects, 
  onTaskClick, 
  onTaskEdit, 
  isAdmin 
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  })
  
  const taskIds = tasks.map(task => task.id)
  
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Заголовок колонки */}
      <div className={`${color} rounded-t-lg p-4 border-b`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs bg-background/80 px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      
      {/* Область для задач */}
      <div 
        ref={setNodeRef}
        className={`flex-1 p-4 bg-background border border-t-0 rounded-b-lg overflow-auto min-h-[400px] ${
          isOver ? 'bg-muted/50 ring-2 ring-primary/50' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                employees={employees}
                projects={projects}
                onTaskClick={onTaskClick}
                onTaskEdit={onTaskEdit}
                isAdmin={isAdmin}
              />
            ))}
            
            {tasks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Перетащите задачи сюда
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
