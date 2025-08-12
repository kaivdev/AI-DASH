import { ModulePicker } from '@/features/modules/ModulePicker'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTasks } from '@/stores/useTasks'
import { useSettings } from '@/stores/useSettings'
import { Moon, Sun } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Topbar() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const onDashboard = location.pathname === '/'
  const [aiOpen, setAiOpen] = useState(false)
  const [aiDraft, setAiDraft] = useState('')
  const [initialQuery, setInitialQuery] = useState<string>('')
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)

  function openChat(autoQuery?: string) {
    setInitialQuery((autoQuery || '').trim())
    setAiOpen(true)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    // apply immediately to avoid flicker
    const root = document.documentElement
    if (next === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    setTheme(next)
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-14 flex items-center gap-4">
        <Link to="/" className="font-semibold hover:underline whitespace-nowrap">AI Life Dashboard</Link>
        <div className="flex-1 flex justify-center">
          {user && (
            <div className="w-full max-w-xl">
              <input
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
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded border inline-flex items-center justify-center hover:bg-muted/40"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user && onDashboard && <ModulePicker />}
          {user ? (
            <Link to="/account" className="h-8 px-3 rounded border text-sm inline-flex items-center justify-center hover:bg-muted/40">
              {user.name}
            </Link>
          ) : (
            <Link to="/login" className="h-8 px-3 rounded border text-sm inline-flex items-center justify-center hover:bg-muted/40">Войти</Link>
          )}
        </div>
      </div>

      {aiOpen && createPortal(
        <AIChatModal
          initialQuery={initialQuery}
          onClose={() => {
            setAiOpen(false)
            setAiDraft('')
          }}
        />,
        document.body
      )}
    </header>
  )
}

function AIChatModal({ onClose, initialQuery = '' }: { onClose: () => void; initialQuery?: string }) {
  type Msg = { role: 'user' | 'assistant'; content: string; ts: string }
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Msg[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const fetchTasks = useTasks((s) => s.fetchTasks)

  const suggestions = [
    'Добавь задачу: Создать презентацию, исполнитель Никита, срок завтра, приоритет высокий',
    'Подведи итоги задач за сегодня',
    'Создай проект: Рефакторинг фронтенда',
  ]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [history, loading])

  useEffect(() => {
    const q = (initialQuery || '').trim()
    if (q) {
      setQuery(q)
      send(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function renderContent(text: string) {
    // simple code block support for ```lang\n...\n```
    const codeMatch = text.match(/^```(\w+)?\n([\s\S]*?)\n```$/)
    if (codeMatch) {
      const lang = codeMatch[1] || ''
      const code = codeMatch[2]
      return (
        <pre className="whitespace-pre-wrap overflow-auto text-xs p-3 rounded-md border bg-muted/10">
          <div className="text-[10px] text-muted-foreground mb-1">{lang}</div>
          <code>{code}</code>
        </pre>
      )
    }
    // default: split paragraphs
    return text.split(/\n\n+/).map((p, i) => (
      <p key={i} className="leading-relaxed">{p}</p>
    ))
  }

  async function send(text?: string) {
    const message = (text ?? query).trim()
    if (!message) return
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    setHistory((h) => [...h, { role: 'user', content: message, ts: now }])
    setQuery('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message }),
      })
      const data = await res.json()
      const summary = data?.result?.summary || 'Готово'
      const ts = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      setHistory((h) => [...h, { role: 'assistant', content: summary, ts }])
      // refresh tasks if backend created/updated tasks (safe to force)
      await fetchTasks(true)
    } catch (e: any) {
      const ts = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      setHistory((h) => [...h, { role: 'assistant', content: 'Ошибка запроса к ИИ', ts }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-5xl rounded-2xl border bg-background shadow-2xl overflow-hidden">
          <button
            aria-label="Закрыть"
            className="absolute top-2 right-2 h-8 w-8 rounded-full border bg-background/80 hover:bg-muted/40"
            onClick={onClose}
          >
            ×
          </button>
          <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-pink-50 dark:from-indigo-950/20 dark:to-pink-950/10">
            <div className="flex items-center justify-between pr-10">
              <div className="font-semibold">Чат с ИИ</div>
            </div>
          </div>
          <ScrollArea className="max-h-[75vh]">
            <div ref={scrollRef} className="p-4 space-y-3">
              {history.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/10 ring-1 ring-indigo-500/20 flex items-center justify-center shadow-sm">🤖</div>}
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl border text-sm whitespace-pre-wrap shadow-sm ${m.role === 'user' ? 'bg-blue-50 dark:bg-blue-500/10 rounded-br-sm ring-1 ring-blue-400/20' : 'bg-muted/10 rounded-bl-sm'}`}>
                    {renderContent(m.content)}
                    <div className="mt-1 text-[10px] text-muted-foreground text-right">{m.ts}</div>
                  </div>
                  {m.role === 'user' && <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/10 ring-1 ring-blue-400/20 flex items-center justify-center shadow-sm">🧑</div>}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify_center">🤖</div>
                  <div className="px-4 py-2 rounded-2xl border text-sm bg-muted/10">
                    <span className="inline-block animate-pulse">Печатает…</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {['Добавь задачу: Создать презентацию, исполнитель Никита, срок завтра, приоритет высокий','Подведи итоги задач за сегодня','Создай проект: Рефакторинг фронтенда'].map((s, idx) => (
              <button key={idx} className="text-xs px-2 py-1 rounded-full border hover:bg-muted/40" onClick={()=> send(s)}>{s}</button>
            ))}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <textarea
              className="min-h-[44px] max-h-[160px] px-3 py-2 rounded border bg-background flex-1 text-sm resize-y"
              placeholder="Напишите команду или вопрос. Shift+Enter — перенос строки, Enter — отправить"
              value={query}
              onChange={(e)=> setQuery(e.target.value)}
              onKeyDown={(e)=>{
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
            />
            <button disabled={loading} className="h-10 px-5 rounded-md border text-sm bg-primary text-primary-foreground shadow-[0_0_0_2px_rgba(124,58,237,0.15)]" onClick={()=> send()}>
              {loading ? '...' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 