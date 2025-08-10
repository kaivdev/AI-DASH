import { useModules } from '@/stores/useModules'
import { registry } from '@/features/modules/registry'
import { cn } from '@/lib/utils'

export function MainGrid() {
  const enabled = useModules((s) => s.enabled)

  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] auto-rows-[220px] gap-4"
      style={{
        // could be adjustable via settings
      }}
    >
      {enabled
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(({ key, size, order }) => {
          const Mod = registry[key]
          if (!Mod) return null
          return (
            <div
              key={`${key}-${order}`}
              className={cn(
                size === '2x2' && 'col-span-2 row-span-2',
                size === '2x1' && 'col-span-2 row-span-1',
                size === '1x1' && 'col-span-1 row-span-1'
              )}
            >
              <Mod />
            </div>
          )
        })}
    </div>
  )
} 