import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '@/types/core'
import { Plus, X, Trash2, Pencil } from 'lucide-react'
import { Select } from '@/components/Select'
import { DatePicker } from '@/components/ui/date-picker'

interface ProjectBoardDialogProps {
  open: boolean
  projects: Project[]
  employees: { id: string; name: string }[]
  onClose: () => void
  onAdd: (data: Omit<Project, 'id'>) => void
  onRemove: (id: string) => void
  onAddMember?: (projectId: string, employeeId: string) => void
  onRemoveMember?: (projectId: string, employeeId: string) => void
  onAddLink?: (projectId: string, link: { title: string; url: string; link_type: 'repo' | 'docs' | 'design' | 'other' }) => void
  onRemoveLink?: (projectId: string, linkId: string) => void
  onUpdateStatus?: (projectId: string, status: Project['status']) => void
  onUpdateProject?: (projectId: string, patch: Partial<Project>) => void
  onUpdateLink?: (projectId: string, linkId: string, patch: { title?: string; url?: string; link_type?: 'repo' | 'docs' | 'design' | 'other' }) => void
}

export function ProjectBoardDialog({ open, projects, employees, onClose, onAdd, onRemove, onAddMember, onRemoveMember, onAddLink, onRemoveLink, onUpdateStatus, onUpdateProject, onUpdateLink }: ProjectBoardDialogProps) {
  const [show, setShow] = useState(false)

  // Quick add
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Project['status']>('active')
  const [tagInput, setTagInput] = useState('')
  const [quickOpen, setQuickOpen] = useState(false)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')

  // Filters
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Project['status']>('all')
  const [member, setMember] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('all')
  const [startFrom, setStartFrom] = useState('')
  const [startTo, setStartTo] = useState('')

  // Inline link form state
  const [editingProjectId, setEditingProjectId] = useState<string>('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState<'repo' | 'docs' | 'design' | 'other'>('repo')
  const [editLinksProjectId, setEditLinksProjectId] = useState<string>('')
  const [linkEdits, setLinkEdits] = useState<Record<string, { title: string; url: string; link_type: 'repo' | 'docs' | 'design' | 'other' }>>({})
  function toggleLinksEditor(p: any) {
    if (editLinksProjectId === p.id) { setEditLinksProjectId(''); setLinkEdits({}) }
    else { const init: any = {}; p.links.forEach((l: any) => init[l.id] = { title: l.title, url: l.url, link_type: l.link_type }); setLinkEdits(init); setEditLinksProjectId(p.id) }
  }

  // Title/description/tags edit state
  const [editProjectId, setEditProjectId] = useState<string>('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTagsInput, setEditTagsInput] = useState('')
  // Add-link visibility like small card
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const linkTypeIcons: Record<'repo' | 'docs' | 'design' | 'other', string> = {
    repo: '🔗',
    docs: '📄',
    design: '🎨',
    other: '📎',
  }

  useEffect(() => {
    if (open) {
      setShow(true)
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', onKey)
  return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
    } else {
      const t = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  function toISODate(d: Date) { return d.toISOString().slice(0,10) }
  function applyPeriod(p: typeof period) {
    const now = new Date()
    if (p === 'today') { setStartFrom(toISODate(now)); setStartTo(toISODate(now)) }
    else if (p === 'week') {
      const day = now.getDay() || 7; const start = new Date(now); start.setDate(now.getDate() - (day - 1)); const end = new Date(start); end.setDate(start.getDate() + 6)
      setStartFrom(toISODate(start)); setStartTo(toISODate(end))
    } else if (p === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1); const end = new Date(now.getFullYear(), now.getMonth()+1, 0)
      setStartFrom(toISODate(start)); setStartTo(toISODate(end))
    } else if (p === 'quarter') {
      const q = Math.floor(now.getMonth()/3); const start = new Date(now.getFullYear(), q*3, 1); const end = new Date(now.getFullYear(), q*3 + 3, 0)
      setStartFrom(toISODate(start)); setStartTo(toISODate(end))
    } else if (p === 'year') {
      const start = new Date(now.getFullYear(), 0, 1); const end = new Date(now.getFullYear(), 11, 31)
      setStartFrom(toISODate(start)); setStartTo(toISODate(end))
    } else if (p === 'all') { setStartFrom(''); setStartTo('') }
  }

  useEffect(() => { if (period !== 'custom') applyPeriod(period) }, [period])

  function onQuickAdd() {
    if (!name.trim()) return
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    onAdd({ name: name.trim(), description: '', tags, links: [], member_ids: [], status, start_date: newStart || undefined, end_date: newEnd || undefined } as any)
    setName(''); setStatus('active'); setTagInput(''); setNewStart(''); setNewEnd('')
  }

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (member && !(p as any).memberIds?.includes(member) && !(p as any).member_ids?.includes(member)) return false
      if (tagFilter) {
        const tf = tagFilter.toLowerCase()
        if (!p.tags.some(t => t.toLowerCase().includes(tf))) return false
      }
      if (startFrom && (!p.start_date || p.start_date < startFrom)) return false
      if (startTo && (!p.start_date || p.start_date > startTo)) return false
      if (query) {
        const q = query.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.tags.join(' ').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [projects, statusFilter, member, query, tagFilter, startFrom, startTo])

  const statusColors: Record<Project['status'], string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-1 dark:ring-yellow-500/20',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 dark:ring-1 dark:ring-red-500/20',
  }

  if (!open && !show) return null

  const node = (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className={`w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-200 flex flex-col pointer-events-auto ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="p-5 border-b flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Проекты</h3>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40" onClick={() => setQuickOpen(v => !v)}>
                {quickOpen ? (<><X className="h-4 w-4" /> Скрыть</>) : (<><Plus className="h-4 w-4" /> Добавить</>)}
              </button>
              <button className="h-8 w-8 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={onClose} aria-label="Закрыть">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4 overflow-auto">
            {/* Quick add */}
            {quickOpen && (
              <div className="p-3 border rounded bg-muted/10 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-3" placeholder="Название проекта" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="md:col-span-2"><Select className="w-full" value={status} onChange={(v)=>setStatus(v as any)} options={[{value:'active',label:'active'},{value:'completed',label:'completed'},{value:'paused',label:'paused'},{value:'cancelled',label:'cancelled'}]} /></div>
                <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-3" placeholder="Теги (через запятую)" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
                <div className="md:col-span-2"><DatePicker 
                  date={newStart ? new Date(newStart) : undefined} 
                  onDateChange={(newDate) => setNewStart(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                  placeholder="Дата начала"
                /></div>
                <div className="md:col-span-2"><DatePicker 
                  date={newEnd ? new Date(newEnd) : undefined} 
                  onDateChange={(newDate) => setNewEnd(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                  placeholder="Дата окончания"
                /></div>
                <div className="md:col-span-2 flex justify-end">
                  <button className="h-9 w-full px-4 rounded border text-sm bg-primary text-primary-foreground inline-flex items-center justify-center gap-2" onClick={onQuickAdd}>
                    <Plus className="h-4 w-4" /> Добавить
                  </button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="p-3 border rounded bg-muted/5 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-3" placeholder="Поиск по названию/тегам" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="md:col-span-2"><Select className="w-full" value={statusFilter} onChange={(v)=>setStatusFilter(v as any)} options={[{value:'all',label:'Все статусы'},{value:'active',label:'active'},{value:'completed',label:'completed'},{value:'paused',label:'paused'},{value:'cancelled',label:'cancelled'}]} /></div>
              <div className="md:col-span-3"><Select className="w-full" value={member} onChange={setMember} options={[{value:'',label:'Все участники'},...employees.map(e=>({value:e.id,label:e.name}))]} /></div>
              <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-2" placeholder="Тег" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
              <div className="md:col-span-2"><Select className="w-full" value={period} onChange={(v)=>setPeriod(v as any)} options={[{value:'all',label:'Все даты'},{value:'today',label:'Сегодня'},{value:'week',label:'Эта неделя'},{value:'month',label:'Этот месяц'},{value:'quarter',label:'Этот квартал'},{value:'year',label:'Этот год'},{value:'custom',label:'Произвольный'}]} /></div>
              {period === 'custom' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">С</span>
                    <DatePicker 
                      date={startFrom ? new Date(startFrom) : undefined} 
                      onDateChange={(newDate) => setStartFrom(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                      placeholder="От"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">По</span>
                    <DatePicker 
                      date={startTo ? new Date(startTo) : undefined} 
                      onDateChange={(newDate) => setStartTo(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                      placeholder="До"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-dashed" />

            {/* List */}
            <div className="max-h-[60vh] overflow-auto border rounded">
              {filtered.map((p) => (
                <div key={p.id} className="px-3 py-3 border-b last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {editProjectId === p.id ? (
                          <input className="h-8 px-2 rounded border bg-background text-sm flex-1" value={editName} onChange={(e)=> setEditName(e.target.value)} placeholder="Название проекта" />
                        ) : (
                          <div className="font-medium">{p.name}</div>
                        )}
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[p.status]}`}>{p.status}</span>
                        {editProjectId !== p.id && p.tags.length > 0 && (
                          <div className="mt-1 text-xs">
                            <div className="flex flex-wrap gap-1">
                              {p.tags.map((t, i) => (<span key={i} className="px-2 py-0.5 rounded bg-muted dark:bg-purple-500/10 dark:text-purple-200 dark:ring-1 dark:ring-purple-500/20">{t}</span>))}
                            </div>
                          </div>
                        )}
                      </div>
                      {editProjectId === p.id ? (
                        <textarea className="mt-2 px-2 py-2 rounded border bg-background text-sm w-full resize-none" rows={2} value={editDescription} onChange={(e)=> setEditDescription(e.target.value)} placeholder="Описание проекта" />
                      ) : (
                        p.description ? (<div className="mt-1 text-xs text-muted-foreground">{p.description}</div>) : null
                      )}
                      {editProjectId === p.id && (
                        <div className="mt-2">
                          <input className="h-7 px-2 rounded border bg-background text-xs w-full" value={editTagsInput} onChange={(e)=> setEditTagsInput(e.target.value)} placeholder="Теги (через запятую)" />
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">Срок: {p.start_date || '—'} → {p.end_date || '—'}</div>

                      {/* Links label and list */}
                      <div className="mt-3">
                        <button className="text-xs text-muted-foreground mb-1 hover:underline" onClick={() => toggleLinksEditor(p)}>Ссылки:</button>
                        {p.links.length > 0 && (
                          <div className="space-y-1">
                            {p.links.map((l) => (
                              <div key={l.id} className="flex items-center gap-2 text-sm relative">
                                <span>{linkTypeIcons[(l as any).link_type as 'repo' | 'docs' | 'design' | 'other']}</span>
                                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{l.title}</a>
                              </div>
                            ))}
                          </div>
                        )}

                        {editLinksProjectId === p.id && (
                          <div className="mt-2 space-y-2">
                            {p.links.map((l: any) => (
                              <div key={l.id} className="flex items-center gap-2 text-xs">
                                <div className="w-[140px]"><Select value={linkEdits[l.id]?.link_type} onChange={(v)=> setLinkEdits((m)=> ({ ...m, [l.id]: { ...(m[l.id]||{}), link_type: v as any } }))} options={[{value:'repo',label:'repo'},{value:'docs',label:'docs'},{value:'design',label:'design'},{value:'other',label:'other'}]} /></div>
                                <input className="h-7 px-2 rounded border bg-background flex-1" value={linkEdits[l.id]?.title || ''} onChange={(e)=> setLinkEdits((m)=> ({ ...m, [l.id]: { ...(m[l.id]||{}), title: e.target.value } }))} placeholder="Название" />
                                <input className="h-7 px-2 rounded border bg-background flex-1" value={linkEdits[l.id]?.url || ''} onChange={(e)=> setLinkEdits((m)=> ({ ...m, [l.id]: { ...(m[l.id]||{}), url: e.target.value } }))} placeholder="https://..." />
                                <button className="h-7 px-2 rounded border hover:bg-muted/40" onClick={()=> { onUpdateLink && onUpdateLink(p.id, l.id, linkEdits[l.id] as any) }}>Сохранить</button>
                                {onRemoveLink && (<button className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={()=> onRemoveLink(p.id, l.id)} title="Удалить" aria-label="Удалить"><Trash2 className="h-3.5 w-3.5" /></button>)}
                              </div>
                            ))}
                            <div className="flex justify-end"><button className="h-7 px-2 rounded border text-xs hover:bg-muted/40" onClick={()=> { setEditLinksProjectId(''); setLinkEdits({}) }}>Готово</button></div>
                          </div>
                        )}
                      </div>

                      {/* Members section */}
                      {(((p as any).memberIds ?? (p as any).member_ids) || []).length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Участники {(((p as any).memberIds ?? (p as any).member_ids) as string[]).length}:</div>
                          <div className="flex flex-wrap gap-1">
                            {(((p as any).memberIds ?? (p as any).member_ids) as string[]).map((id) => {
                              const emp = employees.find(e => e.id === id)
                              if (!emp) return null
                              return (
                                <div key={id} className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-1 dark:ring-blue-500/20 rounded text-xs">
                                  <span>{emp.name}</span>
                                  {onRemoveMember && (
                                    <button className="text-red-600 dark:text-red-300 hover:text-red-800" onClick={() => onRemoveMember(p.id, id)}>×</button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Controls row: add member and link */}
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <div className="w-[200px]">
                          <Select
                            value=""
                            onChange={(v) => { if (v && onAddMember) onAddMember(p.id, v) }}
                            options={[{value:'',label:'+ сотрудник'},...employees
                              .filter(emp => !((p as any).memberIds ?? (p as any).member_ids ?? []).includes(emp.id))
                              .map(emp => ({value:emp.id,label:emp.name}))]}
                          />
                        </div>
                        <button className="h-7 px-2 rounded border text-xs hover:bg-muted/40" onClick={() => setSelectedProjectId(p.id)}>+ ссылка</button>
                      </div>

                      {/* Add link form shown like small card */}
                      {selectedProjectId === p.id && (
                        <div className="mt-2 p-2 border rounded bg-muted/10">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input className="h-7 px-2 rounded border bg-background text-xs" placeholder="Название ссылки" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
                            <Select value={linkType} onChange={(v)=>setLinkType(v as any)} options={[{value:'repo',label:'Репозиторий'},{value:'docs',label:'Документация'},{value:'design',label:'Дизайн'},{value:'other',label:'Другое'}]} />
                          </div>
                          <div className="flex gap-2">
                            <input className="h-7 px-2 rounded border bg-background text-xs flex-1" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                            <button className="h-7 px-2 rounded border text-xs hover:bg-muted/40" onClick={() => { if (onAddLink && linkTitle.trim() && linkUrl.trim()) { onAddLink(p.id, { title: linkTitle.trim(), url: linkUrl.trim(), link_type: linkType }); setLinkTitle(''); setLinkUrl(''); setSelectedProjectId('') } }}>Добавить</button>
                          </div>
                        </div>
                      )}

                      {/* Status inline edit only when editing project */}
                      {editProjectId === p.id && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Статус:</span>
                          <div className="w-[140px]"><Select value={p.status} onChange={(v)=> onUpdateStatus && onUpdateStatus(p.id, v as Project['status'])} options={[{value:'active',label:'active'},{value:'completed',label:'completed'},{value:'paused',label:'paused'},{value:'cancelled',label:'cancelled'}]} /></div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editProjectId === p.id ? (
                        <>
                          <button className="text-xs hover:underline" onClick={()=> { const tagsArr = (editTagsInput || '').split(',').map(t=>t.trim()).filter(Boolean); onUpdateProject && onUpdateProject(p.id, { name: editName.trim() || p.name, description: editDescription, tags: tagsArr } as any); setEditProjectId('') }}>Сохранить</button>
                          <button className="text-xs hover:underline" onClick={()=> { setEditProjectId(''); setEditName(''); setEditDescription(''); setEditTagsInput('') }}>Отмена</button>
                        </>
                      ) : (
                        <>
                          <button className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={()=> { setEditProjectId(p.id); setEditName(p.name); setEditDescription(p.description || ''); setEditTagsInput((p.tags || []).join(', ')) }} title="Редактировать" aria-label="Редактировать">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => onRemove(p.id)} title="Удалить" aria-label="Удалить">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 