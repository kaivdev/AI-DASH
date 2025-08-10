import { ModulePicker } from '@/features/modules/ModulePicker'

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-14 flex items-center justify-between">
        <div className="font-semibold">AI Life Dashboard</div>
        <div className="flex items-center gap-3">
          <ModulePicker />
        </div>
      </div>
    </header>
  )
} 