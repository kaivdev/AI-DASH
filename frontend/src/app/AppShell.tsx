import { Topbar } from './Topbar'
import { MainGrid } from './MainGrid'
import { Toaster } from 'sonner'

export function AppShell() {
  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="container py-6">
        <MainGrid />
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
} 