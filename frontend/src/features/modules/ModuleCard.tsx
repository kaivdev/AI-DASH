import { ReactNode, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useModules } from '@/stores/useModules'
import type { ModuleKey } from '@/features/modules/registry'

export type ModuleCardSize = '1x1' | '2x1' | '2x2'

export function ModuleCard({
  id,
  title,
  size: sizeProp = '1x1',
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
  const setRowSpan = useModules((s) => s.setRowSpan)
  const module = useModules((s) => s.enabled.find((m) => m.key === id))
  const actualSize = module?.size
  const size = actualSize ?? sizeProp
  const rowSpan = module?.rowSpan ?? (size === '2x2' ? 2 : 1)

  const [open, setOpen] = useState(false)

  return (
    <div className={cn('h-full rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col')}> 
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <button className="font-medium truncate hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('module-title-click', { detail: { id } }))}>{title}</button>
        <div className="flex items-center gap-2 text-sm relative">
          <button className="px-2 py-1 rounded border" onClick={() => reorder(id, 'up')}>↑</button>
          <button className="px-2 py-1 rounded border" onClick={() => reorder(id, 'down')}>↓</button>
          <button className="px-2 py-1 rounded border" onClick={() => setOpen((v) => !v)} title="Settings">⚙️</button>
          {open && (
            <div className="absolute right-0 top-10 z-30 w-60 rounded border bg-popover p-3 shadow">
              <div className="text-xs font-medium mb-2">Module settings</div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm text-muted-foreground">Size</label>
                <select
                  className="px-2 py-1 rounded border bg-background"
                  value={size}
                  onChange={(e) => resize(id, e.target.value as ModuleCardSize)}
                >
                  <option value="1x1">1x1</option>
                  <option value="2x1">2x1</option>
                  <option value="2x2">2x2</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-muted-foreground">Row span</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  step={1}
                  value={rowSpan}
                  onChange={(e) => setRowSpan(id, Number(e.target.value))}
                  className="h-8 w-20 px-2 rounded border bg-background"
                />
              </div>
            </div>
          )}
          <button className="px-2 py-1 rounded border" onClick={() => disable(id)}>Hide</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-4">{children}</div>
      {footer && <div className="border-t px-4 py-2 text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
} 