import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import React, { createContext, useContext } from 'react'

type DragActivator = {
  setActivator: (el: HTMLElement | null) => void
  attributes: Record<string, any>
  listeners: Record<string, any>
}

export const DragActivatorContext = createContext<DragActivator | null>(null)
export const useDragActivator = () => useContext(DragActivatorContext)

export function SortableModuleItem({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 50 : undefined,
    cursor: isDragging ? 'grabbing' : undefined,
    willChange: isDragging ? 'transform' as const : undefined,
  } as React.CSSProperties

  const activatorValue: DragActivator = {
    setActivator: setActivatorNodeRef as any,
    attributes: (attributes as any) || {},
    listeners: (listeners as any) || {},
  }

  return (
    <DragActivatorContext.Provider value={activatorValue}>
      <motion.div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative min-h-0 select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          'hover:shadow-lg transition',
          isDragging && 'opacity-0',
          className
        )}
      >
        {children}
      </motion.div>
    </DragActivatorContext.Provider>
  )
} 