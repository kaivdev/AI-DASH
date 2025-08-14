import { useModules } from '@/stores/useModules'
import { registry, type ModuleKey } from '@/features/modules/registry'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/useSettings'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  rectIntersection,
  pointerWithin,
  type CollisionDetection,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragCancelEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { SortableModuleItem } from './SortableModuleItem'
import type { EnabledModule } from '@/stores/useModules'

export function MainGrid() {
  const enabled = useModules((s) => s.enabled)
  const setOrder = useModules((s) => s.setOrder)
  const saveGridPosition = useModules((s) => s.saveGridPosition)
  const rowH = useSettings((s) => s.gridRowHeight)
  const gridRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const items = useMemo<EnabledModule[]>(() => enabled.slice().sort((a, b) => a.order - b.order), [enabled])
  const ids = useMemo<ModuleKey[]>(() => items.map((m) => m.key), [items])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null)
  const lastOverIdRef = useRef<ModuleKey | null>(null)

  useEffect(() => {
    // No-op effect now; we don't maintain a separate preview order during drag
  }, [ids, activeId])

  const computeAndSaveGridPositions = useCallback(
    (orderedKeys: ModuleKey[]) => {
      const grid = gridRef.current
      if (!grid) return
      const style = window.getComputedStyle(grid)
      const template = style.gridTemplateColumns
      const colCount = Math.max(1, (template ? template.split(' ').length : Math.floor(grid.clientWidth / 320)))
      orderedKeys.forEach((key, index) => {
        const gridX = index % colCount
        const gridY = Math.floor(index / colCount)
        saveGridPosition(key, { gridX, gridY })
      })
    },
    [saveGridPosition]
  )

  // Auto-update stored grid positions on container size/viewport changes
  useEffect(() => {
    if (activeId) return // don't update while dragging
    const grid = gridRef.current
    if (!grid) return
    let timer: number | null = null
    const schedule = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        computeAndSaveGridPositions(ids)
      }, 120)
    }
    const RO = (window as any).ResizeObserver
    const ro = RO ? new RO(() => schedule()) : null
    if (ro) ro.observe(grid)
    const onResize = () => schedule()
    window.addEventListener('resize', onResize)
    schedule()
    return () => {
      if (timer) window.clearTimeout(timer)
      if (ro) ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [ids, activeId, computeAndSaveGridPositions])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    const rect = event.active.rect.current?.initial
    if (rect) {
      setActiveRect({ width: rect.width, height: rect.height })
    } else {
      setActiveRect(null)
    }
    lastOverIdRef.current = String(event.active.id) as ModuleKey
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return
      const activeKey = String(active.id) as ModuleKey
      const overKey = String(over.id) as ModuleKey
      if (activeKey === overKey) return
      lastOverIdRef.current = overKey
    },
    []
  )

  const handleDragCancel = useCallback((_: DragCancelEvent) => {
    setActiveId(null)
    setActiveRect(null)
    lastOverIdRef.current = null
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const activeKey = String(active.id) as ModuleKey
      const overKey = over ? (String(over.id) as ModuleKey) : lastOverIdRef.current
      setActiveId(null)
      setActiveRect(null)

      if (!overKey) {
        lastOverIdRef.current = null
        return
      }

      const oldIndex = ids.indexOf(activeKey)
      const newIndex = ids.indexOf(overKey)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        lastOverIdRef.current = null
        return
      }

      const finalOrder = arrayMove(ids, oldIndex, newIndex)
      const newOrderItems: EnabledModule[] = finalOrder.map((k, idx) => {
        const m = items.find((x) => x.key === k)!
        return { ...m, order: idx }
      })

      setOrder(newOrderItems)
      computeAndSaveGridPositions(finalOrder)
      lastOverIdRef.current = null
    },
    [ids, items, setOrder, computeAndSaveGridPositions]
  )

  const activeModule = useMemo(() => items.find((i) => i.key === (activeId as ModuleKey)), [activeId, items])

  const itemByKey = useMemo(() => {
    const map = new Map<ModuleKey, EnabledModule>()
    for (const it of items) map.set(it.key, it)
    return map
  }, [items])

  const computedOverlaySize = useMemo(() => {
    if (activeRect) return activeRect
    if (!activeModule) return { width: 320, height: rowH }
    const grid = gridRef.current
    let columnGap = 16
    let colCount = 1
    if (grid) {
      const style = window.getComputedStyle(grid)
      columnGap = parseFloat(style.columnGap || '16') || 16
      const template = style.gridTemplateColumns
      colCount = Math.max(1, (template ? template.split(' ').length : Math.floor(grid.clientWidth / 320)))
      if (grid.clientWidth === 0) colCount = 1
    }
    const colWidth = grid && colCount > 0 ? (grid.clientWidth - columnGap * (colCount - 1)) / colCount : 320
    const cols = activeModule.size.startsWith('3x') ? 3 : activeModule.size.startsWith('2x') ? 2 : 1
    const width = cols === 1 ? colWidth : cols === 2 ? colWidth * 2 + columnGap : colWidth * 3 + columnGap * 2
    const computedRowSpan = activeModule.rowSpan ?? (activeModule.size === '2x2' || activeModule.size === '3x2' ? 2 : 1)
    const height = computedRowSpan * rowH + (computedRowSpan - 1) * columnGap
    return { width, height }
  }, [activeRect, activeModule, rowH])

  // Stable collision detection preferring last target when still valid
  const collisionDetection: CollisionDetection = useCallback((args) => {
    let collisions = pointerWithin(args)
    if (collisions.length === 0) {
      collisions = rectIntersection(args)
    }
    if (collisions.length > 1 && lastOverIdRef.current) {
      const idx = collisions.findIndex((c) => c.id === lastOverIdRef.current)
      if (idx !== -1) {
        const chosen = collisions[idx]
        return [chosen]
      }
    }
    return collisions
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div
          ref={gridRef}
          className="grid grid-flow-row grid-cols-[repeat(auto-fit,minmax(320px,1fr))] auto-rows-[var(--row-h)] gap-4 w-full h-full"
          style={{ ['--row-h' as any]: `${rowH}px` }}
        >
          {ids.map((key) => {
            const m = itemByKey.get(key)
            if (!m) return null
            const Mod = registry[m.key]
            if (!Mod) return null
            const computedRowSpan = m.rowSpan ?? (m.size === '2x2' || m.size === '3x2' ? 2 : 1)
            return (
              <SortableModuleItem
                key={m.key}
                id={m.key}
                className={cn(
                  m.size.startsWith('3x') && 'col-span-3',
                  m.size === '2x2' && 'col-span-2',
                  m.size === '2x1' && 'col-span-2',
                  m.size === '1x1' && 'col-span-1',
                  computedRowSpan === 1 && 'row-span-1',
                  computedRowSpan === 2 && 'row-span-2',
                  computedRowSpan === 3 && 'row-span-3',
                  computedRowSpan === 4 && 'row-span-4'
                )}
              >
                <Mod />
              </SortableModuleItem>
            )
          })}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }} adjustScale={false}>
        {activeModule ? (
          <div
            className="opacity-95 pointer-events-none"
            style={{ width: computedOverlaySize.width, height: computedOverlaySize.height }}
          >
            {(() => {
              const Mod = registry[activeModule.key]
              return <Mod />
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
} 