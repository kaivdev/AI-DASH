import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function SortableModuleItem({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 50 : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: isDragging ? 'transform' as const : undefined,
  } as React.CSSProperties

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'min-h-0 select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        'hover:shadow-lg transition',
        isDragging && 'opacity-0',
        className
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </motion.div>
  )
} 