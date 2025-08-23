import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useState } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

export function Topbar() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
  const onDashboard = location.pathname === '/'
  const [aiDraft, setAiDraft] = useState('')

  function openChat(autoQuery?: string) {
    // Сохраняем запрос в localStorage для передачи на страницу чата
    if (autoQuery?.trim()) {
      localStorage.setItem('pendingChatQuery', autoQuery.trim())
    }
    navigate('/chat')
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-14 flex items-center gap-4">
        <SidebarTrigger />
        <Link to="/" className="font-semibold hover:underline whitespace-nowrap">AI Life Dashboard</Link>
        <div className="flex-1 flex justify-center">
          {user && (
            <div className="w-full max-w-xl">
              <input
                id="ai-chat-input"
                name="ai-chat-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                className="h-9 w-full px-4 rounded-full border bg-background text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="Чат с ИИ… задайте вопрос или команду"
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                onFocus={() => openChat(aiDraft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    openChat(aiDraft)
                  }
                }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!user && (
            <Link to="/login" className="h-8 px-3 rounded border text-sm inline-flex items-center justify-center hover:bg-muted/40">Войти</Link>
          )}
        </div>
      </div>
    </header>
  )
}