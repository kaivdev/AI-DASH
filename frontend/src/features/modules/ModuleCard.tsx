import { ReactNode, useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useModules } from '@/stores/useModules'
import type { ModuleKey } from '@/features/modules/registry'
import { useDragActivator } from '@/app/SortableModuleItem'
import { MoveUp, MoveDown, Settings, EyeOff } from 'lucide-react'
import { Select } from '@/components/Select'
import { ScrollArea } from '@/components/ui/scroll-area'

export type ModuleCardSize = '1x1' | '2x1' | '2x2'

export function ModuleCard({
  id,
  title,
  size: sizeProp = '1x1',
  footer,
  children,
  headerActions,
}: {
  id: ModuleKey
  title: string
  size?: ModuleCardSize
  footer?: ReactNode
  children: ReactNode
  headerActions?: ReactNode
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

  // Use header as drag activator (left/title zone only)
  const drag = useDragActivator()
  const headerRef = useRef<HTMLDivElement | null>(null)
  const setHeaderHandleRef = useCallback((el: HTMLDivElement | null) => {
    headerRef.current = el
    if (drag) drag.setActivator(el)
  }, [drag])

  return (
    <div className={cn('h-full rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow flex flex-col')}> 
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div
          ref={setHeaderHandleRef}
          {...(drag?.attributes || {})}
          {...(drag?.listeners || {})}
          className="flex-1 cursor-grab select-none pr-2"
        >
          <button className="font-medium truncate hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('module-title-click', { detail: { id } }))}>{title}</button>
        </div>
        <div className="flex items-center gap-2 text-sm relative">
          {headerActions}
          <button className="h-8 w-8 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => reorder(id, 'up')} title="Move up" aria-label="Move up">
            <MoveUp className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => reorder(id, 'down')} title="Move down" aria-label="Move down">
            <MoveDown className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => setOpen((v) => !v)} title="Settings" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </button>
          {open && (
            <div className="absolute right-0 top-10 z-30 w-60 rounded border bg-popover p-3 shadow">
              <div className="text-xs font-medium mb-2">Module settings</div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm text-muted-foreground">Size</label>
                <div className="w-[120px]"><Select value={size} onChange={(v)=>resize(id, v as ModuleCardSize)} options={[{value:'1x1',label:'1x1'},{value:'2x1',label:'2x1'},{value:'2x2',label:'2x2'}]} /></div>
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
          <button className="h-8 w-8 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => disable(id)} title="Hide" aria-label="Hide">
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">{children}</div>
        </ScrollArea>
      </div>
      {footer && <div className="border-t px-4 py-2 text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
} 