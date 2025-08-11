import { ModuleCard } from '@/features/modules/ModuleCard'
import { useProjects } from '@/stores/useProjects'
import { useEmployees } from '@/stores/useEmployees'
import { useState } from 'react'

export function ProjectsCard() {
  const projects = useProjects((s) => s.projects)
  const employees = useEmployees((s) => s.employees)
  const add = useProjects((s) => s.add)
  const addLink = useProjects((s) => s.addLink)
  const addMember = useProjects((s) => s.addMember)
  const removeMember = useProjects((s) => s.removeMember)
  const remove = useProjects((s) => s.remove)

  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')

  const [selectedProject, setSelectedProject] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState<'repo' | 'docs' | 'design' | 'other'>('repo')

  function onAdd() {
    if (!name.trim()) return
    add({
      name: name.trim(),
      description: description.trim(),
      tags: tags.trim().split(',').map(t => t.trim()).filter(Boolean),
      links: [],
      memberIds: [],
      status: 'active',
      startDate: new Date().toISOString().slice(0, 10)
    })
    setName('')
    setDescription('')
    setTags('')
    setShowAddForm(false)
  }

  function onAddLink() {
    if (!selectedProject || !linkTitle.trim() || !linkUrl.trim()) return
    addLink(selectedProject, {
      title: linkTitle.trim(),
      url: linkUrl.trim(),
      type: linkType
    })
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

  return (
    <ModuleCard id="projects" title="Проекты" size="2x2">
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
                      <div className="font-medium">{project.name}</div>
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </div>
                    {project.description && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {project.description}
                      </div>
                    )}
                    {project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {project.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => remove(project.id)}
                  >
                    Удалить
                  </button>
                </div>

                {project.links.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-muted-foreground mb-1">Ссылки:</div>
                    <div className="space-y-1">
                      {project.links.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 text-sm">
                          <span>{linkTypeIcons[link.type]}</span>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {link.title}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    Участники ({project.memberIds.length}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {project.memberIds.map((memberId) => {
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
                      .filter(emp => !project.memberIds.includes(emp.id))
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
                        value={linkType}
                        onChange={(e) => setLinkType(e.target.value as any)}
                        className="h-7 px-2 rounded border bg-background text-xs"
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