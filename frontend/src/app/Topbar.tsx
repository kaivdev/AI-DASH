import { ModulePicker } from '@/features/modules/ModulePicker'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'

export function Topbar() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const onDashboard = location.pathname === '/'

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold hover:underline">AI Life Dashboard</Link>
        <div className="flex items-center gap-3">
          {user && onDashboard && <ModulePicker />}
          {user ? (
            <Link to="/account" className="h-8 px-3 rounded border text-sm inline-flex items-center justify-center">
              {user.name}
            </Link>
          ) : (
            <Link to="/login" className="h-8 px-3 rounded border text-sm inline-flex items-center justify-center">Войти</Link>
          )}
        </div>
      </div>
    </header>
  )
} 