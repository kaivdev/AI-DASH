import { useModules } from '@/stores/useModules'
import { registry } from '@/features/modules/registry'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/useSettings'
import { useEffect, useRef } from 'react'

export function MainGrid() {
  const enabled = useModules((s) => s.enabled)
  const saveGridPosition = useModules((s) => s.saveGridPosition)
  const rowH = useSettings((s) => s.gridRowHeight)
  const gridRef = useRef<HTMLDivElement>(null)

  // Save grid positions when modules are positioned
  useEffect(() => {
    const grid = gridRef.current
    if (!grid || enabled.length === 0) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const moduleEl = entry.target as HTMLElement
          const moduleKey = moduleEl.dataset.moduleKey
          if (!moduleKey) return

          // Calculate approximate grid position
          const rect = moduleEl.getBoundingClientRect()
          const gridRect = grid.getBoundingClientRect()
          const relativeX = rect.left - gridRect.left
          const relativeY = rect.top - gridRect.top
          
          // Estimate grid column and row (rough approximation)
          const gridX = Math.max(0, Math.round(relativeX / 340)) // 320px + 20px gap
          const gridY = Math.max(0, Math.round(relativeY / (rowH + 16))) // rowH + gap
          
          saveGridPosition(moduleKey as any, { gridX, gridY })
        }
      })
    }, { threshold: 0.5 })

    // Observe all module elements
    const moduleElements = grid.querySelectorAll('[data-module-key]')
    moduleElements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [enabled, saveGridPosition, rowH])

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] auto-rows-[var(--row-h)] gap-4"
      style={{ ['--row-h' as any]: `${rowH}px` }}
    >
      {enabled
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(({ key, size, rowSpan, order }) => {
          const Mod = registry[key]
          if (!Mod) return null
          return (
            <div
              key={`${key}-${order}`}
              data-module-key={key}
              className={cn(
                'min-h-0',
                size === '2x2' && 'col-span-2',
                size === '2x1' && 'col-span-2',
                size === '1x1' && 'col-span-1',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 1 && 'row-span-1',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 2 && 'row-span-2',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 3 && 'row-span-3',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 4 && 'row-span-4',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 5 && 'row-span-5',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 6 && 'row-span-6',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 7 && 'row-span-7',
                (rowSpan ?? (size === '2x2' ? 2 : 1)) === 8 && 'row-span-8',
              )}
            >
              <Mod />
            </div>
          )
        })}
    </div>
  )
} 