import { useModules } from '@/stores/useModules'
import { registry, type ModuleKey } from '@/features/modules/registry'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/useSettings'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragCancelEvent,
  DragMoveEvent,
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
  const [contextIds, _setContextIds] = useState<ModuleKey[]>(ids)
  const contextIdsRef = useRef<ModuleKey[]>(ids)
  const lastOverIdRef = useRef<ModuleKey | null>(null)

  const setContextIds = useCallback((next: ModuleKey[] | ((prev: ModuleKey[]) => ModuleKey[])) => {
    _setContextIds((prev) => {
      const value = typeof next === 'function' ? (next as any)(prev) : next
      contextIdsRef.current = value
      return value
    })
  }, [])

  useEffect(() => {
    if (!activeId) {
      contextIdsRef.current = ids
      _setContextIds(ids)
    }
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    contextIdsRef.current = ids
    _setContextIds(ids)
    lastOverIdRef.current = String(event.active.id) as ModuleKey
  }, [ids])

  const reorderPreview = useCallback((activeKey: ModuleKey, overKey: ModuleKey) => {
    setContextIds((prev) => {
      const oldIndex = prev.indexOf(activeKey)
      const newIndex = prev.indexOf(overKey)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        return arrayMove(prev, oldIndex, newIndex)
      }
      return prev
    })
    lastOverIdRef.current = overKey
  }, [setContextIds])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return
      const activeKey = String(active.id) as ModuleKey
      const overKey = String(over.id) as ModuleKey
      if (activeKey === overKey) return
      reorderPreview(activeKey, overKey)
    },
    [reorderPreview]
  )

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over } = event
      if (!over) return
      const activeKey = String(active.id) as ModuleKey
      const overKey = String(over.id) as ModuleKey
      if (activeKey === overKey) return
      reorderPreview(activeKey, overKey)
    },
    [reorderPreview]
  )

  const handleDragCancel = useCallback((_: DragCancelEvent) => {
    setActiveId(null)
    contextIdsRef.current = ids
    _setContextIds(ids)
    lastOverIdRef.current = null
  }, [ids])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const activeKey = String(active.id) as ModuleKey
      const overKeyFallback = over ? (String(over.id) as ModuleKey) : lastOverIdRef.current
      setActiveId(null)

      const previewOrder = contextIdsRef.current
      const isChanged = previewOrder.length === ids.length && previewOrder.some((k, i) => k !== ids[i])

      if (!isChanged) {
        contextIdsRef.current = ids
        _setContextIds(ids)
        lastOverIdRef.current = null
        return
      }

      // Commit the preview order regardless of over equality
      const finalOrder = previewOrder
      const newOrderItems: EnabledModule[] = finalOrder.map((k, idx) => {
        const m = items.find((x) => x.key === k)!
        return { ...m, order: idx }
      })

      setOrder(newOrderItems)
      computeAndSaveGridPositions(finalOrder)
      contextIdsRef.current = finalOrder
      _setContextIds(finalOrder)
      lastOverIdRef.current = null
    },
    [ids, items, setOrder, computeAndSaveGridPositions]
  )

  const activeModule = useMemo(() => items.find((i) => i.key === (activeId as ModuleKey)), [activeId, items])

  const renderOrder = activeId ? contextIds : ids
  const itemByKey = useMemo(() => {
    const map = new Map<ModuleKey, EnabledModule>()
    for (const it of items) map.set(it.key, it)
    return map
  }, [items])

  const overlaySize = useMemo(() => {
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
    const span = activeModule.size === '1x1' ? 1 : 2
    const width = span === 1 ? colWidth : colWidth * 2 + columnGap
    const computedRowSpan = activeModule.rowSpan ?? (activeModule.size === '2x2' ? 2 : 1)
    const height = computedRowSpan * rowH + (computedRowSpan - 1) * columnGap
    return { width, height }
  }, [activeModule, rowH])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragMove={handleDragMove}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={renderOrder} strategy={rectSortingStrategy}>
        <div
          ref={gridRef}
          className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] auto-rows-[var(--row-h)] gap-4 w-full h-full"
          style={{ ['--row-h' as any]: `${rowH}px` }}
        >
          {renderOrder.map((key) => {
            const m = itemByKey.get(key)
            if (!m) return null
            const Mod = registry[m.key]
            if (!Mod) return null
            const computedRowSpan = m.rowSpan ?? (m.size === '2x2' ? 2 : 1)
            return (
              <SortableModuleItem
                key={m.key}
                id={m.key}
                className={cn(
                  m.size === '2x2' && 'col-span-2',
                  m.size === '2x1' && 'col-span-2',
                  m.size === '1x1' && 'col-span-1',
                  computedRowSpan === 1 && 'row-span-1',
                  computedRowSpan === 2 && 'row-span-2',
                  computedRowSpan === 3 && 'row-span-3',
                  computedRowSpan === 4 && 'row-span-4',
                  computedRowSpan === 5 && 'row-span-5',
                  computedRowSpan === 6 && 'row-span-6',
                  computedRowSpan === 7 && 'row-span-7',
                  computedRowSpan === 8 && 'row-span-8'
                )}
              >
                <Mod />
              </SortableModuleItem>
            )
          })}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
        {activeModule ? (
          <div
            className="opacity-95 pointer-events-none"
            style={{ width: overlaySize.width, height: overlaySize.height }}
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