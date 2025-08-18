import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Task, Priority, TaskWorkStatus } from '@/types/core'
import { taskApi } from '@/lib/api'

interface TasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  fetchTasks: (force?: boolean) => Promise<void>
  add: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  toggle: (id: string) => Promise<void>
  update: (id: string, patch: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  // work status setter (goes to backend)
  setWorkStatus: (id: string, status: TaskWorkStatus | undefined) => Promise<void>
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Миграция сохраненных данных старого формата в новый
function migrateTasks(raw: any): Task[] {
  if (!Array.isArray(raw)) return []
       return raw.map((t: any) => ({
      id: t.id,
      content: t.content,
      priority: t.priority,
      due_date: t.due ?? t.due_date ?? undefined,
      done: !!t.done,
      assigned_to: t.assignedTo ?? t.assigned_to ?? undefined,
      project_id: t.projectId ?? t.project_id ?? undefined,
      hours_spent: typeof t.hours_spent === 'number' ? t.hours_spent : 0,
      billable: typeof t.billable === 'boolean' ? t.billable : true,
  // legacy hourly_rate_override dropped
  cost_rate_override: typeof (t as any).cost_rate_override === 'number' ? (t as any).cost_rate_override : undefined,
  bill_rate_override: typeof (t as any).bill_rate_override === 'number' ? (t as any).bill_rate_override : undefined,
  applied_cost_rate: typeof (t as any).applied_cost_rate === 'number' ? (t as any).applied_cost_rate : undefined,
  applied_bill_rate: typeof (t as any).applied_bill_rate === 'number' ? (t as any).applied_bill_rate : undefined,
  // preserve any saved work status, migrate from old local_status
  work_status: (t as any).work_status || (t as any).local_status || undefined,
  // legacy applied_hourly_rate dropped
      created_at: t.created_at ?? new Date().toISOString(),
      updated_at: t.updated_at ?? new Date().toISOString(),
    }))
}

const seed: Task[] = [
  { 
    id: generateId(), 
    content: 'Попробовать новый модуль Metrics', 
    priority: 'M', 
    done: true,
    hours_spent: 0,
    billable: true,
    work_status: 'in_progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: generateId(), 
    content: 'Добавить первую заметку', 
    priority: 'M', 
    done: false,
    hours_spent: 0,
    billable: true,
    work_status: 'paused',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: generateId(), 
    content: 'Спланировать задачи на неделю', 
    priority: 'H', 
    due_date: new Date().toISOString().slice(0,10), 
    done: false,
    hours_spent: 0,
    billable: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
]

export const useTasks = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: seed,
      loading: false,
      error: null,

      fetchTasks: async (force = false) => {
        // Если не принудительно и локально есть данные — не грузим
        if (!force && get().tasks && get().tasks.length > 0) return
        set({ loading: true, error: null })
        try {
          const tasks = await taskApi.getAll() as Task[]
          if (Array.isArray(tasks)) {
            set({ tasks, loading: false })
          } else {
            set({ loading: false })
          }
        } catch (error) {
          console.error('Failed to fetch tasks:', error)
          set({ error: 'Failed to fetch tasks', loading: false })
        }
      },

      add: async (task) => {
        set({ loading: true, error: null })
        try {
         const apiData = {
             content: task.content,
             priority: task.priority,
             due_date: task.due_date || null,
             done: task.done,
             assigned_to: task.assigned_to || null,
             project_id: task.project_id || null,
             hours_spent: typeof task.hours_spent === 'number' ? task.hours_spent : 0,
             billable: typeof task.billable === 'boolean' ? task.billable : true,
       cost_rate_override: (task as any).cost_rate_override ?? null,
       bill_rate_override: (task as any).bill_rate_override ?? null,
       work_status: (task as any).work_status ?? null,
           }
          
          const newTask = await taskApi.create(apiData) as Task
          set((state) => ({
            tasks: [newTask, ...state.tasks],
            loading: false
          }))
        } catch (error) {
          console.error('Failed to create task:', error)
                     const localTask: Task = {
             id: generateId(),
             ...task,
             hours_spent: typeof task.hours_spent === 'number' ? task.hours_spent : 0,
             billable: typeof task.billable === 'boolean' ? task.billable : true,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
           }
          set((state) => ({
            tasks: [localTask, ...state.tasks],
            loading: false,
            error: 'Added locally (API unavailable)'
          }))
        }
      },

      toggle: async (id) => {
        set({ loading: true, error: null })
        try {
          const updatedTask = await taskApi.toggle(id) as Task
          // Если задача стала выполненной, очищаем work_status
          if (updatedTask.done && updatedTask.work_status) {
            await taskApi.update(id, { work_status: null })
            updatedTask.work_status = null
          }
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to toggle task:', error)
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { 
              ...t, 
              done: !t.done, 
              work_status: !t.done ? null : t.work_status, // Очищаем статус при завершении
              updated_at: new Date().toISOString() 
            } : t)),
            loading: false,
            error: 'Updated locally (API unavailable)'
          }))
        }
      },

      update: async (id, patch) => {
        set({ loading: true, error: null })
        try {
          const updatedTask = await taskApi.update(id, patch as any) as Task
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to update task:', error)
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t)),
            loading: false,
            error: 'Updated locally (API unavailable)'
          }))
        }
      },

      remove: async (id) => {
        set({ loading: true, error: null })
        try {
          await taskApi.delete(id)
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to delete task:', error)
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            loading: false,
            error: 'Deleted locally (API unavailable)'
          }))
        }
      },

      setWorkStatus: async (id, status) => {
        set({ loading: true, error: null })
        try {
          const updatedTask = await taskApi.update(id, { work_status: status }) as Task
          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to update work status:', error)
          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? { ...t, work_status: status, updated_at: new Date().toISOString() } : t),
            loading: false,
            error: 'Updated locally (API unavailable)'
          }))
        }
      }
    }),
    { 
      name: 'ai-life-tasks',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ tasks: state.tasks }),
      // миграция сохраненных данных
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return { tasks: seed }
        if (Array.isArray(persistedState.tasks)) {
          return { ...persistedState, tasks: migrateTasks(persistedState.tasks) }
        }
        return persistedState
      }
    }
  )
) 