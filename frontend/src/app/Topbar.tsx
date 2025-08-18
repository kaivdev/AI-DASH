import { Link, useLocation } from 'react-router-dom'
import { apiRequest, chatApi } from '@/lib/api'
import type {} from '@/lib/api'
import { useAuth } from '@/stores/useAuth'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTasks } from '@/stores/useTasks'
import { useSettings } from '@/stores/useSettings'
import { Moon, Sun, Menu, Plus, Trash2, Pencil } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Drawer } from '@/components/ui/drawer'
import { registry, type ModuleKey } from '@/features/modules/registry'
import { useModules } from '@/stores/useModules'
import { Checkbox } from '@/components/ui/checkbox'

export function Topbar() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const onDashboard = location.pathname === '/'
  const [aiOpen, setAiOpen] = useState(false)
  const [aiDraft, setAiDraft] = useState('')
  const [initialQuery, setInitialQuery] = useState<string>('')
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)
  const autoAlign = useSettings((s) => s.autoAlign)
  const setAutoAlign = useSettings((s) => s.setAutoAlign)
  const [menuOpen, setMenuOpen] = useState(false)

  const enabled = useModules((s) => s.enabled)
  const enable = useModules((s) => s.enable)
  const disable = useModules((s) => s.disable)

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

  const enabledKeys = new Set(enabled.map((m) => m.key))

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-14 flex items-center gap-4">
        <button
          onClick={() => setMenuOpen(true)}
          className="h-8 w-8 rounded border inline-flex items-center justify-center hover:bg-muted/40"
          aria-label="Открыть меню"
          title="Меню"
        >
          <Menu className="h-4 w-4" />
        </button>
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
          {!user && (
            <Link to="/login" className="h-8 px-3 rounded border text-sm inline-flex items-center justify-center hover:bg-muted/40">Войти</Link>
          )}
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" title="Меню" widthClassName="w-[92vw] max-w-md">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Навигация</div>
            {user && (
              <>
                <Link to="/" onClick={() => setMenuOpen(false)} className="block rounded border px-3 py-2 hover:bg-muted/40">
                  Дашборд
                </Link>
                <Link to="/kanban" onClick={() => setMenuOpen(false)} className="block rounded border px-3 py-2 hover:bg-muted/40">
                  Kanban Board
                </Link>
              </>
            )}
            {user ? (
              <Link to="/account" onClick={() => setMenuOpen(false)} className="block rounded border px-3 py-2 hover:bg-muted/40">
                Профиль: {user.name}
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded border px-3 py-2 hover:bg-muted/40">
                Войти
              </Link>
            )}
            {user && onDashboard && (
              <button
                onClick={() => setAutoAlign(!autoAlign)}
                className={`w-full text-left rounded border px-3 py-2 text-sm hover:bg-muted/40 ${autoAlign ? 'bg-green-500/10 border-green-500/50' : ''}`}
                title="Автовыравнивание"
                aria-pressed={autoAlign}
              >
                Автовыравнивание: {autoAlign ? 'Вкл.' : 'Выкл.'}
              </button>
            )}
          </div>

          {user && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Модули</div>
              <div className="space-y-2">
                {Object.keys(registry).map((key) => {
                  const k = key as ModuleKey
                  const isOn = enabledKeys.has(k)
                  return (
                    <label key={k} className="flex items-center justify-between rounded border px-3 py-2 hover:bg-muted/30">
                      <div className="font-medium capitalize">{k}</div>
                      <Checkbox checked={isOn} onCheckedChange={() => (isOn ? disable(k) : enable(k))} />
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Drawer>

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
  type ChatSession = { id: string; title: string; createdAt: number; updatedAt: number; messages: Msg[] }
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [renamingId, setRenamingId] = useState<string>('')
  const [renameDraft, setRenameDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const fetchTasks = useTasks((s) => s.fetchTasks)
  const userId = useAuth((s) => s.user?.id)
  const oldHistoryKey = `ai-chat-history:${userId || 'anon'}`
  const storageKey = `ai-chat-v2:${userId || 'anon'}`
  const [hydrated, setHydrated] = useState(false)

  const suggestions = [
    'Добавь задачу: Создать презентацию, исполнитель Никита, срок завтра, приоритет высокий',
    'Подведи итоги задач за сегодня',
    'Создай проект: Рефакторинг фронтенда',
    'Добавь сотрудника: Иван Петров, позиция Backend Developer, ставка 1500',
    'Добавь транзакцию: доход 250000 за январь, проект Dashboard Platform',
    'Добавь заметку: Идеи по оптимизации UI',
    'Добавь чтение: статья “Производительность React”, приоритет высокий',
    'Добавь цель: Запустить новый сайт, период quarterly',
  ]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // lock body scroll
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { 
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  // --- load sessions (server) + fallback migrate once ---
  useEffect(() => {
    ;(async () => {
      try {
        let list = (await chatApi.sessions()) as any[]
        if (Array.isArray(list)) {
          if (list.length === 0) {
            const s = await chatApi.create('Новый чат') as any
            list = [s]
          }
          const ordered = list.sort((a,b)=> new Date(b.updated_at||b.created_at).getTime() - new Date(a.updated_at||a.created_at).getTime())
          setSessions(ordered.map((s:any)=> ({ id: s.id, title: s.title, createdAt: +new Date(s.created_at), updatedAt: +new Date(s.updated_at||s.created_at), messages: [] })))
          setActiveId(ordered[0]?.id || '')
        }
      } catch {
        // fallback: local (dev)
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const data = JSON.parse(raw)
          if (Array.isArray(data?.sessions)) {
            setSessions(data.sessions as ChatSession[])
            setActiveId(data.activeId || (data.sessions[0]?.id || ''))
          }
        }
      }
      setHydrated(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(storageKey, JSON.stringify({ sessions, activeId })) } catch {}
  }, [sessions, activeId, hydrated, storageKey])

  useEffect(() => {
    // auto-scroll to bottom
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [sessions, activeId, loading])

  useEffect(() => {
    const q = (initialQuery || '').trim()
    if (q) setQuery(q)
    // авто-загрузка сообщений для активной сессии
    if (activeId) loadMessages(activeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  function activeSession(): ChatSession | undefined {
    return sessions.find((s) => s.id === activeId)
  }

  function updateSession(id: string, updater: (s: ChatSession) => ChatSession) {
    setSessions((arr) => arr.map((s) => (s.id === id ? updater(s) : s)))
  }

  function newChat() {
    ;(async () => {
      try {
        const s = await chatApi.create('Новый чат') as any
        const sess: ChatSession = { id: s.id, title: s.title, createdAt: +new Date(s.created_at), updatedAt: +new Date(s.updated_at||s.created_at), messages: [] }
        setSessions((arr) => [sess, ...arr])
        setActiveId(sess.id)
        setQuery('')
      } catch {}
    })()
  }

  function deleteChat(id: string) {
    ;(async () => {
      try { await chatApi.remove(id) } catch {}
      setSessions((arr) => {
        const next = arr.filter((s) => s.id !== id)
        const ordered = next.sort((a,b)=> b.updatedAt - a.updatedAt)
        if (id === activeId && ordered.length) setActiveId(ordered[0].id)
        return ordered
      })
    })()
  }

  function startRename(id: string) {
    const s = sessions.find((x)=> x.id===id)
    if (!s) return
    setRenamingId(id)
    setRenameDraft(s.title)
  }

  function commitRename() {
    if (!renamingId) return
    const title = (renameDraft || 'Новый чат').trim().slice(0,80)
    updateSession(renamingId, (s)=> ({ ...s, title }))
    ;(async ()=>{ try { await chatApi.rename(renamingId, title) } catch {} })()
    setRenamingId('')
    setRenameDraft('')
  }

  async function loadMessages(id: string) {
    try {
      const arr = await chatApi.messages(id) as any[]
      setSessions((xs)=> xs.map((s)=> s.id===id ? { ...s, messages: (arr||[]).map((m:any)=> ({ role: m.role, content: m.content, ts: new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) })) } : s))
    } catch {}
  }

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
  const as = activeSession()
    if (!as) return
    const isFirst = (as.messages.length===0)
    updateSession(as.id, (s)=> ({
      ...s,
      title: isFirst ? (message.slice(0,40) || s.title) : s.title,
      updatedAt: Date.now(),
      messages: [...s.messages, { role: 'user', content: message, ts: now }]
    }))
    if (isFirst) { try { await chatApi.rename(as.id, (message.slice(0,40) || 'Новый чат')) } catch {} }
    setQuery('')
    setLoading(true)
    try {
      // 1) Сначала пробуем командный режим
  const cmd = await apiRequest('/ai/command', { method: 'POST', body: JSON.stringify({ query: message, user_id: userId || undefined, chat_id: as.id }) }) as any
      const summary = cmd?.result?.summary?.toString()?.trim()
      const actions = Array.isArray(cmd?.result?.actions) ? cmd.result.actions : []
      const created = Array.isArray(cmd?.result?.created_task_ids) ? cmd.result.created_task_ids : []
      const preferCmd = !!summary && (actions.length > 0 || created.length > 0)
      const domainRe = /(задач|проект|сотрудн|финанс|транзакц|заметк|чтени|goal|цель|ставк|почасов|доход|расход|прибыл|выручк)/i
      const badSummaryRe = /(не найден|ошибк|недоступ|не могу)/i

      let reply = ''
      if (preferCmd || (summary && summary.length > 0 && domainRe.test(message) && !badSummaryRe.test(summary))) {
        reply = summary as string
      } else {
        // 2) Фолбэк: свободный чат
  const chat = await apiRequest('/ai/chat', { method: 'POST', body: JSON.stringify({ query: message, user_id: userId || undefined, chat_id: as.id }) }) as any
        const chatText = chat?.message?.toString()?.trim()
        reply = chatText || summary || 'Готово'
      }

      const ts = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const cur = activeSession()
      if (cur) {
        updateSession(cur.id, (s)=> ({
          ...s,
          updatedAt: Date.now(),
          messages: [...s.messages, { role: 'assistant', content: reply, ts }]
        }))
      }

      // Рефреш данных после возможных действий
      await fetchTasks(true)
      if (/финанс|доход|расход|баланс|transaction/i.test(message)) {
        try { (await import('@/stores/useFinance')).useFinance.getState().fetch() } catch {}
      }
      if (/сотрудник|employee|штат|ставк|позици/i.test(message)) {
        try { (await import('@/stores/useEmployees')).useEmployees.getState().fetchEmployees(true) } catch {}
      }
      if (/проект|project/i.test(message)) {
        try {
          const { projectApi } = await import('@/lib/api')
          const { useProjects } = await import('@/stores/useProjects')
          const items = await projectApi.getAll() as any
          if (Array.isArray(items)) (useProjects as any).setState({ projects: items })
        } catch {}
      }
      if (/заметк|note/i.test(message)) {
        try {
          const { noteApi } = await import('@/lib/api')
          const { useNotes } = await import('@/stores/useNotes')
          const items = await noteApi.getAll() as any
          if (Array.isArray(items)) (useNotes as any).setState({ notes: items })
        } catch {}
      }
      if (/чтени|reading|книг|стат|видео/i.test(message)) {
        try {
          const { readingApi } = await import('@/lib/api')
          const { useReadingList } = await import('@/stores/useReadingList')
          const items = await readingApi.getAll() as any
          if (Array.isArray(items)) (useReadingList as any).setState({ items })
        } catch {}
      }
      if (/цель|goal/i.test(message)) {
        try {
          const { goalApi } = await import('@/lib/api')
          const { useGoals } = await import('@/stores/useGoals')
          const items = await goalApi.getAll() as any
          if (Array.isArray(items)) (useGoals as any).setState({ goals: items })
        } catch {}
      }
    } catch (e: any) {
      const ts = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const cur = activeSession()
      if (cur) {
        updateSession(cur.id, (s)=> ({
          ...s,
          updatedAt: Date.now(),
          messages: [...s.messages, { role: 'assistant', content: 'Ошибка запроса к ИИ', ts }]
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-md" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl rounded-2xl border bg-background shadow-2xl overflow-hidden">
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
          <div className="h-[72vh] grid" style={{gridTemplateColumns:'280px 1fr'}}>
            {/* Sidebar */}
            <div className="border-r flex flex-col min-h-0">
      <div className="p-3 flex items-center justify-between border-b bg-muted/10 sticky top-0 z-10">
                <div className="text-sm font-medium">Ваши чаты</div>
                <button className="h-7 px-2 rounded-md border text-xs inline-flex items-center gap-1 hover:bg-muted/40" onClick={newChat}>
                  <Plus className="h-3.5 w-3.5" /> Новый
                </button>
              </div>
      <div className="flex-1 overflow-y-auto">
                <ul className="p-1 space-y-1">
                  {sessions
        .slice().sort((a,b)=> b.updatedAt - a.updatedAt)
                    .map((s)=> (
                      <li key={s.id}>
                        <div
                          className={`group relative p-2 rounded-md border cursor-pointer hover:bg-muted/40 ${activeId===s.id ? 'bg-muted/30 ring-1 ring-muted-foreground/10' : ''}`}
                          onClick={()=> setActiveId(s.id)}
                        >
                          {renamingId===s.id ? (
                            <div className="flex items-center gap-1">
                              <input autoFocus value={renameDraft} onChange={(e)=> setRenameDraft(e.target.value)} onBlur={commitRename} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); commitRename()} }} className="w-full text-sm px-2 py-1 rounded border bg-background" />
                            </div>
                          ) : (
                            <div className="pr-16">
                              <div className="text-sm font-medium line-clamp-1">{s.title || 'Новый чат'}</div>
                              <div className="text-[10px] text-muted-foreground">{new Date(s.updatedAt).toLocaleString('ru-RU', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</div>
                            </div>
                          )}
                          <div className="absolute right-1 top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="h-6 w-6 rounded border hover:bg-muted/40" title="Переименовать" onClick={(e)=>{ e.stopPropagation(); startRename(s.id) }}>
                              <Pencil className="h-3.5 w-3.5 mx-auto" />
                            </button>
                            <button className="h-6 w-6 rounded border hover:bg-red-50" title="Удалить" onClick={(e)=>{ e.stopPropagation(); if (confirm('Удалить чат?')) deleteChat(s.id) }}>
                              <Trash2 className="h-3.5 w-3.5 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <div ref={scrollRef} className="p-4 space-y-3">
                  {(activeSession()?.messages || []).map((m, i) => (
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
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">🤖</div>
                      <div className="px-4 py-2 rounded-2xl border text-sm bg-muted/10">
                        <span className="inline-block animate-pulse">Печатает…</span>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              </div>
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {["Добавь задачу: Создать презентацию, исполнитель Никита, срок завтра, приоритет высокий","Подведи итоги задач за сегодня","Создай проект: Рефакторинг фронтенда","Добавь сотрудника: Иван Петров, позиция Backend Developer, ставка 1500","Добавь транзакцию: доход 250000 за январь, проект Dashboard Platform","Добавь заметку: Идеи по оптимизации UI","Добавь чтение: статья “Производительность React”, приоритет высокий","Добавь цель: Запустить новый сайт, период quarterly"].map((s, idx) => (
                  <button key={idx} className="text-xs px-2 py-1 rounded-full border hover:bg-muted/40" onClick={()=> send(s)}>{s}</button>
                ))}
                <span className="flex-1" />
                {activeId && (
                  <button className="text-xs px-2 py-1 rounded-full border hover:bg-muted/40" onClick={async ()=>{
                    try { await chatApi.clear(activeId) } catch {}
                    await loadMessages(activeId)
                  }}>Очистить текущий</button>
                )}
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
      </div>
    </div>
  )
} 