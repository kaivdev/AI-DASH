import { ModuleCard } from '@/features/modules/ModuleCard'

export function MetricsCard() {
  return (
    <ModuleCard id="metrics" title="Metrics / Snapshot" size="1x1">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-3xl font-semibold">12</div>
          <div className="text-sm text-muted-foreground">Notes this week</div>
        </div>
        <div>
          <div className="text-3xl font-semibold">8</div>
          <div className="text-sm text-muted-foreground">Tasks done</div>
        </div>
        <div>
          <div className="text-3xl font-semibold">+$420</div>
          <div className="text-sm text-muted-foreground">Monthly balance</div>
        </div>
      </div>
    </ModuleCard>
  )
} 