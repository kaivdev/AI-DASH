import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Goal } from '@/types/core'
import { goalApi } from '@/lib/api'

interface GoalsState {
  goals: Goal[]
  add: (goal: Omit<Goal, 'id'>) => void
  update: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void
  remove: (id: string) => void
  updateProgress: (id: string, progress: number) => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const now = new Date()
const thisQuarter = Math.floor(now.getMonth() / 3) + 1
const quarterStart = new Date(now.getFullYear(), (thisQuarter - 1) * 3, 1)
const quarterEnd = new Date(now.getFullYear(), thisQuarter * 3, 0)

// Start empty; hydrate from backend
const seed: Goal[] = []

export const useGoals = create<GoalsState>()(
  persist(
    (set, get) => {
      ;(async () => {
        try {
          const list = await goalApi.getAll()
          set({ goals: list as any })
        } catch (e) {
          console.warn('Goals load failed, using local data')
        }
      })()

      return {
        goals: seed,
        add: async (goal) => {
          const tempId = generateId()
          set((state) => ({ goals: [{ id: tempId, ...(goal as any) }, ...state.goals] }))
          try {
            const created = await goalApi.create(goal as any)
            set((state) => ({ goals: state.goals.map(g => g.id === tempId ? (created as any) : g) }))
          } catch (e) {
            set((state) => ({ goals: state.goals.filter(g => g.id !== tempId) }))
          }
        },
        update: async (id, patch) => {
          const prev = get().goals
          set({ goals: prev.map(g => g.id === id ? { ...g, ...patch } : g) })
          try {
            const updated = await goalApi.update(id, patch as any)
            set((state) => ({ goals: state.goals.map(g => g.id === id ? (updated as any) : g) }))
          } catch (e) {
            set({ goals: prev })
          }
        },
        remove: async (id) => {
          const prev = get().goals
          set({ goals: prev.filter(g => g.id !== id) })
          try {
            await goalApi.delete(id)
          } catch (e) {
            set({ goals: prev })
          }
        },
        updateProgress: async (id, progress) => {
          const prev = get().goals
          const clamped = Math.max(0, Math.min(100, progress))
          set({ goals: prev.map(g => g.id === id ? { ...g, progress: clamped } : g) })
          try {
            const updated = await goalApi.updateProgress(id, clamped)
            set((state) => ({ goals: state.goals.map(g => g.id === id ? (updated as any) : g) }))
          } catch (e) {
            set({ goals: prev })
          }
        }
      }
    },
    { name: 'ai-life-goals' }
  )
)