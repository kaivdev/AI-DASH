import { registry, ModuleKey } from './registry'
import { useModules } from '@/stores/useModules'

export function ModulePicker() {
  const enabled = useModules((s) => s.enabled)
  const enable = useModules((s) => s.enable)
  const disable = useModules((s) => s.disable)

  const enabledKeys = new Set(enabled.map((m) => m.key))

  return (
    <div className="flex items-center gap-2">
      {Object.keys(registry).map((key) => {
        const k = key as ModuleKey
        const isOn = enabledKeys.has(k)
        return (
          <button
            key={k}
            className={`h-8 px-3 rounded border ${isOn ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
            onClick={() => (isOn ? disable(k) : enable(k))}
            title={isOn ? 'Disable' : 'Enable'}
          >
            {k}
          </button>
        )
      })}
    </div>
  )
} 