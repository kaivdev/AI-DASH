import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Task, Priority } from '@/types/core'
import { X, Save, Calendar, User, FolderOpen, AlertCircle } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'

interface TaskFormDialogProps {
  open: boolean
  task?: Task | null
  employees: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  isAdmin: boolean
}

export function TaskFormDialog({ 
  open, 
  task, 
  employees, 
  projects, 
  onClose, 
  onSave, 
  isAdmin 
}: TaskFormDialogProps) {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Состояние формы
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<Priority>('M')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [projectId, setProjectId] = useState('')
  const [hoursSpent, setHoursSpent] = useState(0)
  const [billable, setBillable] = useState(true)
  
  // Показ/скрытие диалога
  useEffect(() => {
    if (open) {
      setShow(true)
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      
      const onKey = (e: KeyboardEvent) => { 
        if (e.key === 'Escape') onClose() 
      }
      document.addEventListener('keydown', onKey)
      
      return () => { 
        document.body.style.overflow = prev
        document.removeEventListener('keydown', onKey) 
      }
    } else {
      const t = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(t)
    }
  }, [open, onClose])
  
  // Заполнение формы при редактировании
  useEffect(() => {
    if (task) {
      setContent(task.content)
      setPriority(task.priority)
      setDueDate(task.due_date || '')
      setAssignedTo(task.assigned_to || '')
      setProjectId(task.project_id || '')
      setHoursSpent(task.hours_spent || 0)
      setBillable(task.billable ?? true)
    } else {
      setContent('')
      setPriority('M')
      setDueDate('')
      setAssignedTo('')
      setProjectId('')
      setHoursSpent(0)
      setBillable(true)
    }
  }, [task])
  
  // Обработка сохранения
  async function handleSave() {
    if (!content.trim()) return
    
    setLoading(true)
    try {
      await onSave({
        content: content.trim(),
        priority,
        due_date: dueDate || undefined,
        done: task?.done || false,
        assigned_to: assignedTo || undefined,
        project_id: projectId || undefined,
        hours_spent: hoursSpent,
        billable,
        cost_rate_override: task?.cost_rate_override,
        bill_rate_override: task?.bill_rate_override,
        applied_cost_rate: task?.applied_cost_rate,
        applied_bill_rate: task?.applied_bill_rate,
        approved: task?.approved,
        approved_at: task?.approved_at,
        work_status: task?.work_status,
        created_at: task?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Omit<Task, 'id' | 'created_at' | 'updated_at'>)
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (!open && !show) return null

  const node = (
    <div className="fixed inset-0 z-50">
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`} 
        onClick={onClose} 
      />
      
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className={`w-full max-w-lg bg-background rounded-lg border shadow-xl transition-all duration-200 ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          
          {/* Заголовок */}
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {task ? 'Редактировать задачу' : 'Создать задачу'}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded hover:bg-muted/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Содержимое формы */}
          <div className="p-6 space-y-4">
            {/* Описание задачи */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Описание задачи *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows={3}
                placeholder="Описание задачи..."
                required
              />
            </div>
            
            {/* Приоритет и дата */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Приоритет
                </label>
                <Select 
                  value={priority} 
                  onChange={(v) => setPriority(v as Priority)}
                  options={[
                    { value: 'L', label: 'Низкий' },
                    { value: 'M', label: 'Средний' },
                    { value: 'H', label: 'Высокий' }
                  ]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Срок выполнения
                </label>
                <DatePicker 
                  date={dueDate ? new Date(dueDate) : undefined}
                  onDateChange={(date) => setDueDate(date ? date.toISOString().slice(0, 10) : '')}
                  placeholder="Выберите дату"
                />
              </div>
            </div>
            
            {/* Исполнитель и проект */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Исполнитель
                </label>
                <Select 
                  value={assignedTo}
                  onChange={setAssignedTo}
                  options={[
                    { value: '', label: 'Не назначен' },
                    ...employees.map(e => ({ value: e.id, label: e.name }))
                  ]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Проект
                </label>
                <Select 
                  value={projectId}
                  onChange={setProjectId}
                  options={[
                    { value: '', label: 'Без проекта' },
                    ...projects.map(p => ({ value: p.id, label: p.name }))
                  ]}
                />
              </div>
            </div>
            
            {/* Часы и оплачиваемость */}
            {task && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Потрачено часов
                  </label>
                  <input
                    type="number"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    step="0.5"
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={billable}
                    onChange={(e) => setBillable(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="billable" className="text-sm">
                    Оплачиваемая работа
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Кнопки действий */}
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded-lg hover:bg-muted/60 transition-colors"
            >
              Отмена
            </button>
            
            <button
              onClick={handleSave}
              disabled={loading || !content.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
