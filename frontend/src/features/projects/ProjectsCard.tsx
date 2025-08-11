import { ModuleCard } from '@/features/modules/ModuleCard'
import { useProjects } from '@/stores/useProjects'
import { useEmployees } from '@/stores/useEmployees'
import { useEffect, useState } from 'react'
import { ProjectBoardDialog } from './ProjectBoardDialog'

export function ProjectsCard() {
  const projects = useProjects((s) => s.projects)
  const employees = useEmployees((s) => s.employees)
  const add = useProjects((s) => s.add)
  const addLink = useProjects((s) => s.addLink)
  const updateLink = useProjects((s) => s.updateLink)
  const removeLink = useProjects((s) => s.removeLink)
  const addMember = useProjects((s) => s.addMember)
  const removeMember = useProjects((s) => s.removeMember)
  const remove = useProjects((s) => s.remove)

  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedProject, setSelectedProject] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState<'repo' | 'docs' | 'design' | 'other'>('repo')

  const [boardOpen, setBoardOpen] = useState(false)
  const [editId, setEditId] = useState<string>('')
  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'paused' | 'cancelled'>('active')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const updateProject = useProjects((s) => s.update)

  // title/description inline edit
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTagsInput, setEditTagsInput] = useState('')

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
      tags: tags.trim().split(',').map(t => t.trim()).filter(Boolean),
      links: [],
      member_ids: [],
      status: 'active',
      start_date: startDate || undefined,
      end_date: endDate || undefined
    } as any)
    setName('')
    setDescription('')
    setTags('')
    setStartDate('')
    setEndDate('')
    setShowAddForm(false)
  }

  function startInlineEdit(p: any) {
    setEditId(p.id)
    setEditStatus(p.status)
    setEditStart(p.start_date || '')
    setEditEnd(p.end_date || '')
    setEditTitle(p.name)
    setEditDescription(p.description || '')
    setEditTagsInput((p.tags || []).join(', '))
  }

  function saveInlineEdit() {
    if (!editId) return
    const parsedTags = (editTagsInput || '').split(',').map(t=>t.trim()).filter(Boolean)
    updateProject(editId, { 
      status: editStatus, 
      start_date: editStart || undefined, 
      end_date: editEnd || undefined,
      name: editTitle?.trim() || undefined,
      description: editDescription ?? undefined,
      tags: parsedTags,
    } as any)
    setEditId('')
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
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    paused: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800'
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

  return (
    <ModuleCard id="projects" title="Проекты" size="2x2">
      <ProjectBoardDialog
        open={boardOpen}
        projects={projects as any}
        employees={employees}
        onClose={() => setBoardOpen(false)}
        onAdd={(p) => add(p as any)}
        onRemove={(id) => remove(id)}
        onAddMember={(pid, eid) => addMember(pid, eid)}
        onRemoveMember={(pid, eid) => removeMember(pid, eid)}
        onAddLink={(pid, link) => addLink(pid, link as any)}
        onRemoveLink={(pid, lid) => removeLink(pid, lid)}
        onUpdateStatus={(pid, st) => useProjects.getState().update(pid, { status: st } as any)}
        onUpdateProject={(pid, patch) => useProjects.getState().update(pid, patch as any)}
        onUpdateLink={(pid, lid, patch) => useProjects.getState().updateLink(pid, lid, patch as any)}
      />
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Всего: {projects.length}
          </div>
          <button 
            className="h-8 px-3 rounded border text-sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Отмена' : 'Добавить'}
          </button>
        </div>

        {showAddForm && (
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
                <input 
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="react, typescript, frontend"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block">Начало</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Окончание</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  />
                </div>
              </div>
            </div>
            <button 
              className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground mt-3"
              onClick={onAdd}
            >
              Создать проект
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="p-3 border rounded">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {editId === project.id ? (
                        <input className="h-7 px-2 rounded border bg-background text-sm flex-1" value={editTitle} onChange={(e)=> setEditTitle(e.target.value)} placeholder="Название проекта" />
                      ) : (
                        <div className="font-medium">{project.name}</div>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">Срок: {(project as any).start_date || '—'} → {(project as any).end_date || '—'}</div>
                    {editId === project.id ? (
                      <textarea className="px-2 py-2 rounded border bg-background w-full text-sm resize-none mb-2" rows={2} value={editDescription} onChange={(e)=> setEditDescription(e.target.value)} placeholder="Описание проекта" />
                    ) : (
                      project.description && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {project.description}
                        </div>
                      )
                    )}
                    {editId !== project.id && project.tags.length > 0 && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {project.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => startInlineEdit(project)}>Ред.</button>
                    <button 
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => remove(project.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>

                {editId === project.id && (
                  <div className="mb-2 p-2 border rounded bg-muted/10 text-xs flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Статус</span>
                    <select className="h-7 px-2 rounded border bg-background" value={editStatus} onChange={(e)=>setEditStatus(e.target.value as any)}>
                      <option value="active">active</option>
                      <option value="completed">completed</option>
                      <option value="paused">paused</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <span className="ml-2 text-muted-foreground">Начало</span>
                    <input type="date" className="h-7 px-2 rounded border bg-background" value={editStart} onChange={(e)=>setEditStart(e.target.value)} />
                    <span className="ml-2 text-muted-foreground">Окончание</span>
                    <input type="date" className="h-7 px-2 rounded border bg-background" value={editEnd} onChange={(e)=>setEditEnd(e.target.value)} />
                    <span className="ml-2 text-muted-foreground">Теги</span>
                    <input className="h-7 px-2 rounded border bg-background flex-1 min-w-[180px]" value={editTagsInput} onChange={(e)=> setEditTagsInput(e.target.value)} placeholder="react, ts" />
                    <div className="ml-auto flex items-center gap-2">
                      <button className="h-7 px-2 rounded border" onClick={saveInlineEdit}>Сохранить</button>
                      <button className="h-7 px-2 rounded border" onClick={()=>setEditId('')}>Отмена</button>
                    </div>
                  </div>
                )}

                {project.links.length > 0 && (
                  <div className="mb-2">
                    <button className="text-xs text-muted-foreground mb-1 hover:underline" onClick={() => toggleLinksEditor(project)}>Ссылки:</button>
                    {editLinksProjectId === project.id ? (
                      <div className="space-y-2">
                        {project.links.map((l: any) => (
                          <div key={l.id} className="flex items-center gap-2 text-xs">
                            <select
                              className="h-7 px-2 rounded border bg-background"
                              value={linkEdits[l.id]?.link_type}
                              onChange={(e) => setLinkEdits((m) => ({ ...m, [l.id]: { ...(m[l.id]||{}), link_type: e.target.value as any } }))}
                            >
                              <option value="repo">repo</option>
                              <option value="docs">docs</option>
                              <option value="design">design</option>
                              <option value="other">other</option>
                            </select>
                            <input
                              className="h-7 px-2 rounded border bg-background flex-1"
                              value={linkEdits[l.id]?.title || ''}
                              onChange={(e) => setLinkEdits((m) => ({ ...m, [l.id]: { ...(m[l.id]||{}), title: e.target.value } }))}
                              placeholder="Название"
                            />
                            <input
                              className="h-7 px-2 rounded border bg-background flex-1"
                              value={linkEdits[l.id]?.url || ''}
                              onChange={(e) => setLinkEdits((m) => ({ ...m, [l.id]: { ...(m[l.id]||{}), url: e.target.value } }))}
                              placeholder="https://..."
                            />
                            <button className="h-7 px-2 rounded border" onClick={() => updateLink(project.id, l.id, linkEdits[l.id] as any)}>Сохранить</button>
                            <button className="h-7 px-2 rounded border text-red-600" onClick={() => removeLink(project.id, l.id)}>Удалить</button>
                          </div>
                        ))}
                        <div className="flex justify-end">
                          <button className="h-7 px-2 rounded border text-xs" onClick={() => { setEditLinksProjectId(''); setLinkEdits({}) }}>Готово</button>
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      {project.links.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 text-sm">
                          <span>{linkTypeIcons[(link as any).link_type as 'repo' | 'docs' | 'design' | 'other']}</span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link.title}</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    Участники {(project as any).memberIds?.length ?? 0}:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(project as any).memberIds?.map((memberId: string) => {
                      const employee = employees.find(e => e.id === memberId)
                      if (!employee) return null
                      return (
                        <div key={memberId} className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs">
                          <span>{employee.name}</span>
                          <button 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => removeMember(project.id, memberId)}
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <select
                    className="h-7 px-2 rounded border bg-background text-xs"
                    onChange={(e) => {
                      if (e.target.value) addMember(project.id, e.target.value)
                      e.target.value = ''
                    }}
                  >
                    <option value="">+ сотрудник</option>
                    {employees
                      .filter(emp => !(project as any).memberIds?.includes(emp.id))
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))
                    }
                  </select>
                  
                  <button 
                    className="h-7 px-2 rounded border text-xs"
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
                      <select
                        className="h-7 px-2 rounded border bg-background text-xs"
                        value={linkType}
                        onChange={(e) => setLinkType(e.target.value as any)}
                      >
                        <option value="repo">Репозиторий</option>
                        <option value="docs">Документация</option>
                        <option value="design">Дизайн</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        value={linkUrl} 
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="h-7 px-2 rounded border bg-background text-xs flex-1"
                        placeholder="https://..."
                      />
                      <button 
                        className="h-7 px-2 rounded border text-xs"
                        onClick={onAddLink}
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleCard>
  )
} 