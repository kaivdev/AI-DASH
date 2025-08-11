import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Task, Priority } from '@/types/core'
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: generateId(), 
    content: 'Добавить первую заметку', 
    priority: 'M', 
    done: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: generateId(), 
    content: 'Спланировать задачи на неделю', 
    priority: 'H', 
    due_date: new Date().toISOString().slice(0,10), 
    done: false,
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
            project_id: task.project_id || null
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
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to toggle task:', error)
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, updated_at: new Date().toISOString() } : t)),
            loading: false,
            error: 'Updated locally (API unavailable)'
          }))
        }
      },

      update: async (id, patch) => {
        set({ loading: true, error: null })
        try {
          const updatedTask = await taskApi.update(id, patch) as Task
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