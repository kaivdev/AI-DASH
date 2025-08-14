import { ReactNode, useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useModules } from '@/stores/useModules'
import type { ModuleKey } from '@/features/modules/registry'
import { useDragActivator } from '@/app/SortableModuleItem'
import { MoveUp, MoveDown, EyeOff } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSettings } from '@/stores/useSettings'

export type ModuleCardSize = '1x1' | '2x1' | '2x2' | '3x1' | '3x2'

export function ModuleCard({
  id,
  title,
  size: _sizeProp = '1x1',
  footer,
  children,
  headerActions,
}: {
  id: ModuleKey
  title: string
  size?: ModuleCardSize
  footer?: ReactNode
  children?: ReactNode
  headerActions?: ReactNode
}) {
  const resize = useModules((s) => s.resize)
  const disable = useModules((s) => s.disable)
  const reorder = useModules((s) => s.reorder)
  const setRowSpan = useModules((s) => s.setRowSpan)
  const savePosition = useModules((s) => s.savePosition)
  const module = useModules((s) => s.enabled.find((m) => m.key === id))

  const autoAlign = useSettings((s) => s.autoAlign)
  const rowH = useSettings((s) => s.gridRowHeight)

  // Use header as drag activator (left/title zone only)
  const drag = useDragActivator()
  const headerRef = useRef<HTMLDivElement | null>(null)
  const setHeaderHandleRef = useCallback((el: HTMLDivElement | null) => {
    headerRef.current = el
    if (drag) drag.setActivator(el)
  }, [drag])

  // Resize state
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isResizing, setIsResizing] = useState<null | 'right' | 'bottom' | 'left' | 'top'>(null)
  const startRectRef = useRef<{ w: number; h: number; x: number; y: number } | null>(null)
  const gridMetricsRef = useRef<{ colWidth: number; colGap: number; rowGap: number; colCount: number } | null>(null)
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null)

  const getGridMetrics = useCallback(() => {
    const el = rootRef.current
    if (!el) return null
    const grid = el.closest('.grid') as HTMLElement | null
    if (!grid) return null
    const style = window.getComputedStyle(grid)
    const template = String(style.gridTemplateColumns || '')
    const colCount = Math.max(1, template ? template.split(' ').length : Math.floor(grid.clientWidth / 320))
    const colGap = parseFloat(String(style.columnGap || '16')) || 16
    const rowGap = parseFloat(String(style.rowGap || '16')) || 16
    const colWidth = colCount > 0 ? (grid.clientWidth - colGap * (colCount - 1)) / colCount : 320
    return { colWidth, colGap, rowGap, colCount }
  }, [])

  const commitResize = useCallback((wPx: number, hPx: number) => {
    const gm = gridMetricsRef.current || getGridMetrics()
    if (!gm) return
    const { colWidth, colGap, rowGap } = gm
    const w1 = colWidth
    const w2 = colWidth * 2 + colGap
    const w3 = colWidth * 3 + colGap * 2
    const t12 = (w1 + w2) / 2
    const t23 = (w2 + w3) / 2
    const cols = wPx < t12 ? 1 : (wPx < t23 ? 2 : 3)

    const units = Math.max(1, Math.min(4, Math.round((hPx + rowGap) / (rowH + rowGap))))

    let nextSize: ModuleCardSize
    if (cols === 1) nextSize = '1x1'
    else if (cols === 2) nextSize = units >= 2 ? '2x2' : '2x1'
    else nextSize = units >= 2 ? '3x2' : '3x1'

    resize(id, nextSize)
    setRowSpan(id, units)
  }, [id, resize, setRowSpan, rowH, getGridMetrics])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!isResizing) return
      const start = startRectRef.current
      const gm = gridMetricsRef.current
      const root = rootRef.current
      if (!start || !gm || !root) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y

      const span3 = gm.colWidth * 3 + gm.colGap * 2
      const maxW = span3
      const minW = Math.max(260, Math.min(gm.colWidth - 40, gm.colWidth))
      let rawW = start.w
      if (isResizing === 'right') rawW = start.w + dx
      if (isResizing === 'left') rawW = start.w - dx
      let w = Math.max(minW, Math.min(maxW, rawW))

      const maxH = rowH * 4 + gm.rowGap * 3
      const minH = Math.max(140, Math.min(rowH, 180))
      let rawH = start.h
      if (isResizing === 'bottom') rawH = start.h + dy
      if (isResizing === 'top') rawH = start.h - dy
      let h = Math.max(minH, Math.min(maxH, rawH))

      if (autoAlign) {
        commitResize(w, h)
      } else {
        const stepW = gm.colWidth / 2
        const stepH = rowH / 2
        const snap = (value: number, step: number) => Math.round(value / step) * step
        w = Math.max(minW, Math.min(maxW, snap(w, stepW)))
        h = Math.max(minH, Math.min(maxH, snap(h, stepH)))
        setPreviewSize({ w, h })
      }
    }
    function onUp() {
      if (!isResizing) return
      const start = startRectRef.current
      const gm = gridMetricsRef.current || getGridMetrics()
      if (start && gm) {
        const maxW = gm.colWidth * 3 + gm.colGap * 2
        const minW = Math.max(260, Math.min(gm.colWidth - 40, gm.colWidth))
        const maxH = rowH * 4 + gm.rowGap * 3
        const minH = Math.max(140, Math.min(rowH, 180))
        const w0 = previewSize ? previewSize.w : start.w
        const h0 = previewSize ? previewSize.h : start.h
        const w = Math.max(minW, Math.min(maxW, w0))
        const h = Math.max(minH, Math.min(maxH, h0))
        if (!autoAlign) {
          savePosition(id, { x: 0, y: 0, width: w, height: h })
        }
        commitResize(w, h)
      }
      setIsResizing(null)
      startRectRef.current = null
      gridMetricsRef.current = null
      setPreviewSize(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    if (isResizing) {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isResizing, autoAlign, commitResize, previewSize, rowH, getGridMetrics, id, savePosition])

  const onResizeStart = useCallback((e: React.PointerEvent, dir: 'right' | 'bottom' | 'left' | 'top') => {
    e.preventDefault()
    e.stopPropagation()
    const root = rootRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    startRectRef.current = { w: rect.width, h: rect.height, x: e.clientX, y: e.clientY }
    gridMetricsRef.current = getGridMetrics()
    setIsResizing(dir)
  }, [getGridMetrics])

  // Visual preview overlay (no layout change)
  const previewOverlay = useMemo(() => {
    if (!previewSize || autoAlign) return null
    return (
      <div className="absolute inset-0 pointer-events-none z-50">
        <div
          className="absolute top-0 left-0 border-2 border-primary/60 bg-primary/10 rounded-lg"
          style={{ width: previewSize.w, height: previewSize.h }}
        />
      </div>
    )
  }, [previewSize, autoAlign])

  return (
    <div ref={rootRef} className={cn('h-full rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow flex flex-col relative')}> 
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

      {previewOverlay}

      {/* Resize handles */}
      <div
        onPointerDown={(e) => onResizeStart(e, 'right')}
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize touch-none select-none"
        style={{ transform: 'translateX(50%)' }}
      />
      <div
        onPointerDown={(e) => onResizeStart(e, 'left')}
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize touch-none select-none"
        style={{ transform: 'translateX(-50%)' }}
      />
      <div
        onPointerDown={(e) => onResizeStart(e, 'bottom')}
        className="absolute left-0 bottom-0 w-full h-2 cursor-ns-resize touch-none select-none"
        style={{ transform: 'translateY(50%)' }}
      />
      <div
        onPointerDown={(e) => onResizeStart(e, 'top')}
        className="absolute left-0 top-0 w-full h-2 cursor-ns-resize touch-none select-none"
        style={{ transform: 'translateY(-50%)' }}
      />
    </div>
  )
} 