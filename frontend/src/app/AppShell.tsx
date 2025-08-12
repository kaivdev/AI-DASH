import { Topbar } from './Topbar'
import { MainGrid } from './MainGrid'
import { Toaster } from 'sonner'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { AccountPage } from './AccountPage'
import { RegisterPage } from './RegisterPage'
import { useAuth } from '@/stores/useAuth'

export function AppShell() {
  const token = useAuth((s) => s.token)

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 min-h-0 w-full overflow-auto p-4 md:p-6 lg:p-8 bg-muted/20">
        <Routes>
          <Route path="/" element={token ? <MainGrid /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={token ? <AccountPage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
        </Routes>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
} 