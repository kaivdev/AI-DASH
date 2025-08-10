import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useModules } from '@/stores/useModules'
import type { ModuleKey } from '@/features/modules/registry'

export type ModuleCardSize = '1x1' | '2x1' | '2x2'

export function ModuleCard({
  id,
  title,
  size = '1x1',
  footer,
  children,
}: {
  id: ModuleKey
  title: string
  size?: ModuleCardSize
  footer?: ReactNode
  children: ReactNode
}) {
  const resize = useModules((s) => s.resize)
  const disable = useModules((s) => s.disable)
  const reorder = useModules((s) => s.reorder)

  return (
    <div className={cn('h-full rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col')}> 
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="font-medium truncate">{title}</div>
        <div className="flex items-center gap-2 text-sm">
          <button className="px-2 py-1 rounded border" onClick={() => reorder(id, 'up')}>↑</button>
          <button className="px-2 py-1 rounded border" onClick={() => reorder(id, 'down')}>↓</button>
          <select
            className="px-2 py-1 rounded border bg-background"
            value={size}
            onChange={(e) => resize(id, e.target.value as ModuleCardSize)}
          >
            <option value="1x1">1x1</option>
            <option value="2x1">2x1</option>
            <option value="2x2">2x2</option>
          </select>
          <button className="px-2 py-1 rounded border" onClick={() => disable(id)}>Hide</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">{children}</div>
      {footer && <div className="border-t px-4 py-2 text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
} 