import { Topbar } from './Topbar'
import { MainGrid } from './MainGrid'
import { Toaster } from 'sonner'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { AccountPage } from './AccountPage'
import { RegisterPage } from './RegisterPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { useAuth } from '@/stores/useAuth'
import { useEffect } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import AiChatPage from '@/features/aichat/page'

export function AppShell() {
  const token = useAuth((s) => s.token)
  const location = useLocation()

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const api = await import('@/lib/api')
        // Parallel fetch
        const [employees, tasks, txs, projects, goals, notes, reading] = await Promise.all([
          api.employeeApi.getAll().catch(()=>null),
          api.taskApi.getAll().catch(()=>null),
          api.transactionApi.getAll().catch(()=>null),
          api.projectApi.getAll().catch(()=>null),
          api.goalApi.getAll().catch(()=>null),
          api.noteApi.getAll().catch(()=>null),
          api.readingApi.getAll().catch(()=>null),
        ])
        if (cancelled) return
        // Merge helpers
        const mergeById = (server: any[]|null, local: any[]|undefined) => {
          if (!Array.isArray(server)) return undefined
          const l = Array.isArray(local) ? local : []
          return [...server, ...l.filter((x:any) => !server.some((s:any) => s.id === x.id))]
        }
        // Apply to stores
        if (Array.isArray(employees)) {
          const { useEmployees } = await import('@/stores/useEmployees')
          ;(useEmployees as any).setState({ employees })
        }
        if (Array.isArray(tasks)) {
          const { useTasks } = await import('@/stores/useTasks')
          ;(useTasks as any).setState({ tasks })
        }
        if (Array.isArray(txs)) {
          const { useFinance } = await import('@/stores/useFinance')
          ;(useFinance as any).setState({ txs })
        }
        {
          const { useProjects } = await import('@/stores/useProjects')
          const local = (useProjects as any).getState().projects
          const merged = mergeById(Array.isArray(projects)?projects:null, local)
          if (merged) (useProjects as any).setState({ projects: merged })
        }
        {
          const { useGoals } = await import('@/stores/useGoals')
          const local = (useGoals as any).getState().goals
          const merged = mergeById(Array.isArray(goals)?goals:null, local)
          if (merged) (useGoals as any).setState({ goals: merged })
        }
        {
          const { useNotes } = await import('@/stores/useNotes')
          const local = (useNotes as any).getState().notes
          const merged = mergeById(Array.isArray(notes)?notes:null, local)
          if (merged) (useNotes as any).setState({ notes: merged })
        }
        {
          const { useReadingList } = await import('@/stores/useReadingList')
          const local = (useReadingList as any).getState().items
          const merged = mergeById(Array.isArray(reading)?reading:null, local)
          if (merged) (useReadingList as any).setState({ items: merged })
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [token])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen flex flex-col">
          <Topbar />
          <main className={`flex-1 min-h-0 w-full ${location.pathname === '/chat' ? 'overflow-hidden' : 'overflow-auto p-4 md:p-6 lg:p-8 bg-muted/20'}`}>
            <Routes>
              <Route path="/" element={token ? <MainGrid /> : <Navigate to="/login" replace />} />
              <Route path="/kanban" element={token ? <KanbanPage /> : <Navigate to="/login" replace />} />
              <Route path="/chat" element={token ? <AiChatPage /> : <Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/account" element={token ? <AccountPage /> : <Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
            </Routes>
          </main>
          <Toaster richColors position="top-right" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 