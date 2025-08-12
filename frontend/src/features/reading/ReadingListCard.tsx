import { ModuleCard } from '@/features/modules/ModuleCard'
import { useReadingList } from '@/stores/useReadingList'
import { useState } from 'react'
import { Plus, X, Trash2, Play, CheckSquare, Pencil } from 'lucide-react'
import { Select } from '@/components/Select'

export function ReadingListCard() {
  const items = useReadingList((s) => s.items)
  const add = useReadingList((s) => s.add)
  const update = useReadingList((s) => s.update)
  const markAsReading = useReadingList((s) => s.markAsReading)
  const markAsCompleted = useReadingList((s) => s.markAsCompleted)
  const remove = useReadingList((s) => s.remove)

  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<'article' | 'book' | 'video' | 'podcast' | 'course' | 'other'>('article')
  const [priority, setPriority] = useState<'L' | 'M' | 'H'>('M')
  const [tags, setTags] = useState('')

  const [editId, setEditId] = useState<string>('')
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')

  function onAdd() {
    if (!title.trim()) return
    add({
      title: title.trim(),
      url: url.trim() || undefined,
      content: content.trim() || undefined,
      item_type: type,
      status: 'to_read',
      priority,
      tags: tags.trim().split(',').map(t => t.trim()).filter(Boolean),
      added_date: new Date().toISOString().slice(0, 10)
    } as any)
    setTitle('')
    setUrl('')
    setContent('')
    setTags('')
    setShowAddForm(false)
  }

  const statusColors = {
    to_read: 'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-1 dark:ring-gray-500/20',
    reading: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20',
    completed: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20',
    archived: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 dark:ring-1 dark:ring-red-500/20'
  }

  const statusLabels = {
    to_read: 'К чтению',
    reading: 'Читаю',
    completed: 'Прочитано',
    archived: 'Архив'
  }

  const typeIcons = {
    article: '📄',
    book: '📚',
    video: '🎥',
    podcast: '🎧',
    course: '🎓',
    other: '📎'
  }

  const priorityColors = {
    L: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20',
    M: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-1 dark:ring-yellow-500/20',
    H: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 dark:ring-1 dark:ring-red-500/20'
  }

  return (
    <ModuleCard
      id="reading"
      title="Reading List"
      size="2x2"
      headerActions={
        <button
          className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-muted/40"
          onClick={() => setShowAddForm((prev) => {
            const next = !prev
            if (next) {
              setTitle(''); setUrl(''); setContent(''); setType('article'); setPriority('M'); setTags('')
            }
            return next
          })}
        >
          {showAddForm ? (<><X className="h-4 w-4" /> Отмена</>) : (<><Plus className="h-4 w-4" /> Добавить</>)}
        </button>
      }
    >
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="text-sm text-muted-foreground">К чтению: {items.filter(i => i.status === 'to_read').length} | Читаю: {items.filter(i => i.status === 'reading').length}</div>

        {showAddForm && (
          <div className="p-3 border rounded bg-muted/10">
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block">Название *</label>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="Название книги/статьи/видео..."
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">URL (если есть)</label>
                <input 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-8 px-3 rounded border bg-background w-full text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Заметки/Контент</label>
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  className="px-3 py-2 rounded border bg-background w-full text-sm resize-none"
                  rows={2}
                  placeholder="Заметки, выдержки или описание..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs mb-1 block">Тип</label>
                  <Select value={type} onChange={(v)=>setType(v as any)} options={[
                    {value:'article',label:'Статья'},
                    {value:'book',label:'Книга'},
                    {value:'video',label:'Видео'},
                    {value:'podcast',label:'Подкаст'},
                    {value:'course',label:'Курс'},
                    {value:'other',label:'Другое'},
                  ]} />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Приоритет</label>
                  <Select value={priority} onChange={(v)=>setPriority(v as any)} options={[{value:'L',label:'Низкий'},{value:'M',label:'Средний'},{value:'H',label:'Высокий'}]} />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Теги</label>
                  <input 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                    placeholder="react, dev"
                  />
                </div>
              </div>
            </div>
            <button 
              className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground mt-3 inline-flex items-center gap-2"
              onClick={onAdd}
            >
              <Plus className="h-4 w-4" /> Добавить в список
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="p-3 border rounded">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{typeIcons[item.item_type as keyof typeof typeIcons]}</span>
                      <div className="font-medium">{item.title}</div>
                      <span className={`px-2 py-1 rounded text-xs ${priorityColors[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.added_date}</span>
                      {item.completed_date && (
                        <span className="text-xs text-green-600 dark:text-green-300">Завершено: {item.completed_date}</span>
                      )}
                    </div>
                    {item.url && (
                      <div className="mb-2">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          {item.url.length > 50 ? `${item.url.slice(0, 50)}...` : item.url}
                        </a>
                      </div>
                    )}
                    {item.content && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {item.content.length > 100 ? `${item.content.slice(0, 100)}...` : item.content}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-sm italic text-muted-foreground mb-2">
                        💭 {item.notes}
                      </div>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-purple-500/10 dark:text-purple-200 dark:ring-1 dark:ring-purple-500/20 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {editId === item.id && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input className="h-7 px-2 rounded border bg-background text-xs" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Название" />
                        <input className="h-7 px-2 rounded border bg-background text-xs" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://..." />
                        <div className="col-span-2 flex gap-2">
                          <button className="h-7 px-2 rounded border text-xs hover:bg-muted/40" onClick={() => { update(item.id, { title: editTitle.trim() || item.title, url: editUrl.trim() || item.url }); setEditId(''); setEditTitle(''); setEditUrl('') }}>Сохранить</button>
                          <button className="h-7 px-2 rounded border text-xs hover:bg-muted/40" onClick={() => { setEditId(''); setEditTitle(''); setEditUrl('') }}>Отмена</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                      onClick={() => { setEditId(item.id); setEditTitle(item.title); setEditUrl(item.url || '') }}
                      title="Редактировать" aria-label="Редактировать"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      className="h-7 w-7 rounded border inline-flex items-center justify-center hover:bg-muted/40"
                      onClick={() => remove(item.id)}
                      title="Удалить" aria-label="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  {item.status === 'to_read' && (
                    <button 
                      className="h-7 px-2 rounded border text-xs bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20 inline-flex items-center gap-1"
                      onClick={() => markAsReading(item.id)}
                    >
                      <Play className="h-3.5 w-3.5" /> Начать
                    </button>
                  )}
                  {item.status === 'reading' && (
                    <button 
                      className="h-7 px-2 rounded border text-xs bg-green-50 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20 inline-flex items-center gap-1"
                      onClick={() => markAsCompleted(item.id)}
                    >
                      <CheckSquare className="h-3.5 w-3.5" /> Завершить
                    </button>
                  )}
                  {item.status === 'completed' && (
                    <span className="h-7 px-2 rounded bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20 text-xs flex items-center">
                      ✅ Прочитано
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleCard>
  )
} 