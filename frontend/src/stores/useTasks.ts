import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, Priority } from '@/types/core'

interface TasksState {
  tasks: Task[]
  add: (content: string, priority?: Priority, due?: string) => void
  toggle: (id: string) => void
  update: (id: string, patch: Partial<Omit<Task, 'id'>>) => void
  remove: (id: string) => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const seed: Task[] = [
  { id: generateId(), content: 'Try enabling Metrics module', priority: 'M', done: true },
  { id: generateId(), content: 'Add your first Note', priority: 'M', done: false },
  { id: generateId(), content: 'Plan week tasks', priority: 'H', due: new Date().toISOString().slice(0,10), done: false },
]

export const useTasks = create<TasksState>()(
  persist(
    (set) => ({
      tasks: seed,
      add: (content, priority = 'M', due) =>
        set((state) => ({
          tasks: [
            { id: generateId(), content, priority, due, done: false },
            ...state.tasks,
          ],
        })),
      toggle: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      update: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      remove: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
    }),
    { name: 'ai-life-tasks' }
  )
) 