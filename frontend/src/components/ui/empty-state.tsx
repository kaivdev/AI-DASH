import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title?: string
  description?: string
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }>
  children?: ReactNode
}

export function EmptyState({ title, description, actions, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      {title && (
        <h3 className="text-base font-medium text-muted-foreground mb-3">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {children}

      {actions && actions.length > 0 && (
        <div className="flex flex-col gap-2 w-full max-w-[180px]">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
              className="w-full h-9 text-sm"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
} 