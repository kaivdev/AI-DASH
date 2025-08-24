import { ModuleCard } from '@/features/modules/ModuleCard'
import { useProjects } from '@/stores/useProjects'
import { useEmployees } from '@/stores/useEmployees'
import { useEffect, useState, useMemo } from 'react'
import { ProjectBoardDialog } from './ProjectBoardDialog'
import { QuickAddProjectDialog } from './QuickAddProjectDialog'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import { Select } from '@/components/Select'
import { DatePicker } from '@/components/ui/date-picker'
import { ProjectDetailDrawer } from './ProjectDetailDrawer'
import { useTasks } from '@/stores/useTasks'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAuth } from '@/stores/useAuth'
import { TagCombobox } from '@/components/ui/tag-combobox'
import { EmptyState } from '@/components/ui/empty-state'
import { useFinance } from '@/stores/useFinance'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export function ProjectsCard() {
  const projects = useProjects((s) => s.projects)
  const fetchProjects = useProjects((s) => (s as any).fetchAll)
  const sortedProjects = projects.slice().sort((a,b)=> (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0))
  const employees = useEmployees((s) => s.employees)
  const add = useProjects((s) => s.add)
  const addLink = useProjects((s) => s.addLink)
  const tasks = useTasks((s) => s.tasks)
  const txs = useFinance((s) => s.txs)
  const taskCounts = useMemo(() => {
    const m = new Map<string, { total: number; open: number; done: number }>()
    for (const t of tasks) {
      const pid = (t as any).project_id as string | undefined
      if (!pid) continue
      const row = m.get(pid) || { total: 0, open: 0, done: 0 }
      row.total += 1
      if (t.done) row.done += 1
      else row.open += 1
      m.set(pid, row)
    }
    return m
  }, [tasks])
  const updateLink = useProjects((s) => s.updateLink)
  const removeLink = useProjects((s) => s.removeLink)
  const addMember = useProjects((s) => s.addMember)
  const removeMember = useProjects((s) => s.removeMember)
  const remove = useProjects((s) => s.remove)

  const user = useAuth((s)=>s.user)
  const isAdmin = (user?.role === 'owner' || user?.role === 'admin')

  useEffect(() => { try { fetchProjects?.() } catch {} }, [fetchProjects])

  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedProject, setSelectedProject] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState<'repo' | 'docs' | 'design' | 'other'>('repo')

  const [boardOpen, setBoardOpen] = useState(false)
  const updateProject = useProjects((s) => s.update)
  
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Confirm delete state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    function onTitleClick(e: any) {
      if (e?.detail?.id === 'projects') setBoardOpen(true)
    }
    window.addEventListener('module-title-click', onTitleClick as any)
    return () => window.removeEventListener('module-title-click', onTitleClick as any)
  }, [])

  function onAdd() {
    if (!name.trim()) return
    add({
      name: name.trim(),
      description: description.trim(),
      tags: tags,
      links: [],
      member_ids: [],
      status: 'active',
      start_date: startDate || undefined,
      end_date: endDate || undefined
    } as any)
    setName('')
    setDescription('')
    setTags([])
    setStartDate('')
    setEndDate('')
    setShowAddForm(false)
  }

  function onAddLink() {
    if (!selectedProject || !linkTitle.trim() || !linkUrl.trim()) return
    addLink(selectedProject, {
      title: linkTitle.trim(),
      url: linkUrl.trim(),
      link_type: linkType
    } as any)
    setLinkTitle('')
    setLinkUrl('')
    setSelectedProject('')
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-1 dark:ring-yellow-500/20',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 dark:ring-1 dark:ring-red-500/20'
  }

  const linkTypeIcons = {
    repo: '🔗',
    docs: '📄',
    design: '🎨',
    other: '📎'
  }

  // Убрано контекстное меню для ссылок; редактирование через заголовок "Ссылки:"
  const [editLinksProjectId, setEditLinksProjectId] = useState<string>('')
  const [linkEdits, setLinkEdits] = useState<Record<string, { title: string; url: string; link_type: 'repo' | 'docs' | 'design' | 'other' }>>({})

  function toggleLinksEditor(p: any) {
    if (editLinksProjectId === p.id) {
      setEditLinksProjectId('')
      setLinkEdits({})
    } else {
      const init: Record<string, any> = {}
      p.links.forEach((l: any) => { init[l.id] = { title: l.title, url: l.url, link_type: l.link_type } })
      setLinkEdits(init)
      setEditLinksProjectId(p.id)
    }
  }

  const detailProject = detailProjectId ? projects.find(p => p.id === detailProjectId) || null : null

  return (
    <ModuleCard
      id="projects"
      title="Проекты"
      size="2x2"
      headerActions={
  isAdmin && (
  <button
          className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40"
          onClick={() => setQuickAddOpen(true)}
        >
          <Plus className="h-4 w-4" /> Добавить
        </button>
  )
      }
    >
             <ProjectBoardDialog
         open={boardOpen}
         projects={projects as any}
         employees={employees}
         onClose={() => setBoardOpen(false)}
         onAdd={(p) => isAdmin ? add(p as any) : undefined}
        onRemove={(id) => { if (!isAdmin) return; setPendingDeleteId(id); setConfirmOpen(true) }}
         onAddMember={(pid, eid) => isAdmin ? addMember(pid, eid) : undefined}
         onRemoveMember={(pid, eid) => isAdmin ? removeMember(pid, eid) : undefined}
         onAddLink={(pid, link) => addLink(pid, link as any)}
         onRemoveLink={(pid, lid) => removeLink(pid, lid)}
         onUpdateStatus={(pid, st) => useProjects.getState().update(pid, { status: st } as any)}
         onUpdateProject={(pid, patch) => useProjects.getState().update(pid, patch as any)}
         onUpdateLink={(pid, lid, patch) => useProjects.getState().updateLink(pid, lid, patch as any)}
       />

      <ProjectDetailDrawer
        open={detailOpen}
        project={detailProject as any}
        employees={employees}
        onClose={() => { setDetailOpen(false); setEditMode(false); }}
        onEdit={async (id, patch) => { try { await updateProject(id, patch as any) } catch {} }}
        onRemove={async (id) => { if (!isAdmin) return; setPendingDeleteId(id); setConfirmOpen(true) }}
        onAddMember={async (pid, eid) => { if (!isAdmin) return; try { await addMember(pid, eid) } catch {} }}
        onRemoveMember={async (pid, eid) => { if (!isAdmin) return; try { await removeMember(pid, eid) } catch {} }}
        onAddLink={async (pid, link) => { try { await addLink(pid, link as any) } catch {} }}
        onRemoveLink={async (pid, lid) => { try { await removeLink(pid, lid) } catch {} }}
        isAdmin={isAdmin}
        startInEditMode={editMode}
      />

      <QuickAddProjectDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />

      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="text-sm text-muted-foreground">Всего: {projects.length}</div>

  {isAdmin && showAddForm && (
          <div className="p-3 border rounded bg-muted/10">
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block">Название проекта *</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="Новый проект"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Описание</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="px-3 py-2 rounded border bg-background w-full text-sm resize-none"
                  rows={2}
                  placeholder="Описание проекта..."
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Теги (через запятую)</label>
                <TagCombobox
                  value={tags}
                  onChange={setTags}
                  tagType="project_tag"
                  placeholder="Добавьте теги..."
                  className="min-h-[32px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block">Начало</label>
                  <DatePicker 
                    date={startDate ? new Date(startDate) : undefined} 
                    onDateChange={(newDate) => {
                      if (newDate === undefined) { 
                        setStartDate(''); 
                        return 
                      }
                      const t = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000)
                      setStartDate(t.toISOString().slice(0, 10))
                    }} 
                    className="h-8 w-full" 
                    placeholder="Начало"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Окончание</label>
                  <DatePicker 
                    date={endDate ? new Date(endDate) : undefined} 
                    onDateChange={(newDate) => {
                      if (newDate === undefined) { 
                        setEndDate(''); 
                        return 
                      }
                      const t = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000)
                      setEndDate(t.toISOString().slice(0, 10))
                    }} 
                    className="h-8 w-full" 
                    placeholder="Окончание"
                  />
                </div>
              </div>
            </div>
            <button 
              className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground mt-3 inline-flex items-center gap-2"
              onClick={onAdd}
            >
              <Plus className="h-4 w-4" /> Создать проект
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-3">
            {sortedProjects.length === 0 && (
              <EmptyState
                title="Нет данных"
                description="Добавьте свой первый проект, чтобы начать организацию работы и достижение целей"
                actions={[
                  {
                    label: '+ Добавить проект',
                    onClick: () => setShowAddForm(true),
                    variant: 'default'
                  }
                ]}
              />
            )}
            {sortedProjects.map((project) => (
              <div key={project.id} className="p-3 border rounded">
                <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <button className="font-medium text-left" onClick={() => { setDetailProjectId(project.id); setDetailOpen(true) }}>{project.name}</button>
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[project.status]}`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">Срок: {(project as any).start_date ? formatDate((project as any).start_date) : '—'} → {(project as any).end_date ? formatDate((project as any).end_date) : '—'}</div>
                      {project.description && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {project.description}
                        </div>
                      )}
                      {project.tags.length > 0 && (
                        <div className="mb-2 min-w-0">
                          <div className="flex flex-wrap gap-1">
                            {project.tags.map((tag, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-purple-500/10 dark:text-purple-200 dark:ring-1 dark:ring-purple-500/20 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                                      <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40" onClick={() => { setDetailProjectId(project.id); setEditMode(true); setDetailOpen(true); }} title="Редактировать" aria-label="Редактировать">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button 
                        className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                        onClick={() => { setPendingDeleteId(project.id); setConfirmOpen(true) }}
                        title="Удалить" aria-label="Удалить"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                                                 </div>

                {/* Task counts */}
                {(() => {
                  const c = taskCounts.get(project.id) || { total: 0, open: 0, done: 0 }
                  return (
                    <div className="mb-1 text-xs">Задачи: <b>{c.total}</b> (в работе <b>{c.open}</b>, завершено <b>{c.done}</b>)</div>
                  )
                })()}

                {/* Aggregates: hide money for non-admins */}
                <div className="mb-2 text-xs text-muted-foreground">
                  {(() => {
                    const projTasks = tasks.filter(t => (t as any).project_id === project.id)
                    const approvedDone = projTasks.filter(t => t.done && (t as any).approved === true)
                    const totalHours = approvedDone.reduce((s, t) => s + (t.hours_spent || 0), 0)
                    const incomeSum = isAdmin ? txs.filter(tx => (tx as any).project_id === project.id && (tx as any).transaction_type === 'income').reduce((s, tx) => s + tx.amount, 0) : null
                    return (
                      <div className="flex flex-wrap gap-4">
                        <span>Итого часы: <b>{totalHours}</b></span>
                        {isAdmin && <span>Итого сумма (по биллабельным): <b>{formatCurrency(incomeSum as any, 'RUB')}</b></span>}
                      </div>
                    )
                  })()}
                </div>

 

                {project.links.length > 0 && (
                  <div className="mb-2">
                    <div className="space-y-1">
                      {project.links.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 text-sm">
                          <span>{linkTypeIcons[(link as any).link_type as 'repo' | 'docs' | 'design' | 'other']}</span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{link.title}</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-2">
                  {(() => {
                    const memberIds: string[] = ((project as any).memberIds ?? (project as any).member_ids ?? []) as string[]
                    return (
                      <>
                        <div className="text-xs text-muted-foreground mb-1">Участники {memberIds.length}:</div>
                        <div className="flex flex-wrap gap-1">
                          {memberIds.map((memberId: string) => {
                            const employee = employees.find(e => e.id === memberId)
                            if (!employee) return null
                            return (
                              <div key={memberId} className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-1 dark:ring-blue-500/20 rounded text-xs">
                                <span>{employee.name}</span>
                                <button
                                  className="text-red-600 dark:text-red-300 hover:text-red-800"
                                  onClick={() => removeMember(project.id, memberId)}
                                  title="Убрать"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )
                  })()}
                </div>
                 
                <div className="flex gap-2 text-xs">
                  <div className="w-[200px]">
                    {(() => {
                      const existing: string[] = ((project as any).memberIds ?? (project as any).member_ids ?? []) as string[]
                      return (
                        <Select
                          onChange={(v)=>{ if (v) addMember(project.id, v) }}
                          value=""
                          options={[{value:'',label:'+ сотрудник'}, ...employees.filter(emp => !existing.includes(emp.id)).map(emp=>({value:emp.id,label:emp.name}))]}
                        />
                      )
                    })()}
                  </div>
                  
                  <button 
                    className="h-7 px-2 rounded border text-xs hover:bg-muted/40"
                    onClick={() => setSelectedProject(project.id)}
                  >
                    + ссылка
                  </button>
                </div>

                {selectedProject === project.id && (
                  <div className="mt-2 p-2 border rounded bg-muted/10">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input 
                        value={linkTitle} 
                        onChange={(e) => setLinkTitle(e.target.value)}
                        className="h-7 px-2 rounded border bg-background text-xs"
                        placeholder="Название ссылки"
                      />
                      <Select value={linkType} onChange={(v)=>setLinkType(v as any)} options={[{value:'repo',label:'Репозиторий'},{value:'docs',label:'Документация'},{value:'design',label:'Дизайн'},{value:'other',label:'Другое'}]} />
                    </div>
                    <div className="flex gap-2">
                      <input 
                        value={linkUrl} 
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="h-7 px-2 rounded border bg-background text-xs flex-1"
                        placeholder="https://..."
                      />
                      <button 
                        className="h-7 px-2 rounded border text-xs hover:bg-muted/40"
                        onClick={onAddLink}
                      >
                        <Plus className="h-3.5 w-3.5" /> Добавить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm delete dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(o)=>{ if(!o){ setConfirmOpen(false); setPendingDeleteId(null); setDeleteConfirmText('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Проект будет удален.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <div className="text-sm mb-2">Для подтверждения удаления введите слово <span className="font-semibold">"удалить"</span>.</div>
            <input
              className="h-9 px-3 rounded border bg-background w-full text-sm"
              placeholder="Введите: удалить"
              value={deleteConfirmText}
              onChange={(e)=> setDeleteConfirmText(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={()=>{ setConfirmOpen(false); setPendingDeleteId(null) }}>Отмена</AlertDialogCancel>
            <AlertDialogAction disabled={deleteConfirmText.trim().toLowerCase() !== 'удалить'} onClick={async ()=>{ if(pendingDeleteId){ try { await remove(pendingDeleteId) } catch {} } setConfirmOpen(false); setPendingDeleteId(null); setDetailOpen(false); setDeleteConfirmText('') }}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleCard>
  )
} 