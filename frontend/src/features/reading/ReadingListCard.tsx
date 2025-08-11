import { ModuleCard } from '@/features/modules/ModuleCard'
import { useReadingList } from '@/stores/useReadingList'
import { useState } from 'react'

export function ReadingListCard() {
  const items = useReadingList((s) => s.items)
  const add = useReadingList((s) => s.add)
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

  function onAdd() {
    if (!title.trim()) return
    add({
      title: title.trim(),
      url: url.trim() || undefined,
      content: content.trim() || undefined,
      type,
      status: 'to_read',
      priority,
      tags: tags.trim().split(',').map(t => t.trim()).filter(Boolean),
      addedDate: new Date().toISOString().slice(0, 10)
    })
    setTitle('')
    setUrl('')
    setContent('')
    setTags('')
    setShowAddForm(false)
  }

  const statusColors = {
    to_read: 'bg-gray-100 text-gray-800',
    reading: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800'
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
    L: 'bg-green-100 text-green-800',
    M: 'bg-yellow-100 text-yellow-800',
    H: 'bg-red-100 text-red-800'
  }

  return (
    <ModuleCard id="reading" title="Reading List" size="2x2">
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            К чтению: {items.filter(i => i.status === 'to_read').length} | 
            Читаю: {items.filter(i => i.status === 'reading').length}
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
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  >
                    <option value="article">Статья</option>
                    <option value="book">Книга</option>
                    <option value="video">Видео</option>
                    <option value="podcast">Подкаст</option>
                    <option value="course">Курс</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block">Приоритет</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="h-8 px-3 rounded border bg-background w-full text-sm"
                  >
                    <option value="L">Низкий</option>
                    <option value="M">Средний</option>
                    <option value="H">Высокий</option>
                  </select>
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
              className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground mt-3"
              onClick={onAdd}
            >
              Добавить в список
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
                      <span className="text-lg">{typeIcons[item.type]}</span>
                      <div className="font-medium">{item.title}</div>
                      <span className={`px-2 py-1 rounded text-xs ${priorityColors[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.addedDate}</span>
                      {item.completedDate && (
                        <span className="text-xs text-green-600">Завершено: {item.completedDate}</span>
                      )}
                    </div>
                    {item.url && (
                      <div className="mb-2">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
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
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => remove(item.id)}
                  >
                    Удалить
                  </button>
                </div>

                <div className="flex gap-2">
                  {item.status === 'to_read' && (
                    <button 
                      className="h-7 px-2 rounded border text-xs bg-blue-50"
                      onClick={() => markAsReading(item.id)}
                    >
                      Начать читать
                    </button>
                  )}
                  {item.status === 'reading' && (
                    <button 
                      className="h-7 px-2 rounded border text-xs bg-green-50"
                      onClick={() => markAsCompleted(item.id)}
                    >
                      Завершить
                    </button>
                  )}
                  {item.status === 'completed' && (
                    <span className="h-7 px-2 rounded bg-green-100 text-green-800 text-xs flex items-center">
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