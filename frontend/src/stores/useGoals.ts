import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Goal } from '@/types/core'

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

const seed: Goal[] = [
  {
    id: generateId(),
    title: 'Запуск дашборд платформы',
    description: 'Создать полнофункциональный дашборд для управления проектами и командой',
    period: 'quarterly',
    startDate: quarterStart.toISOString().slice(0, 10),
    endDate: quarterEnd.toISOString().slice(0, 10),
    status: 'active',
    progress: 60,
    tags: ['development', 'product']
  },
  {
    id: generateId(),
    title: 'Увеличить доходность на 20%',
    description: 'Оптимизировать процессы и привлечь новых клиентов',
    period: 'quarterly',
    startDate: quarterStart.toISOString().slice(0, 10),
    endDate: quarterEnd.toISOString().slice(0, 10),
    status: 'active',
    progress: 35,
    tags: ['business', 'growth']
  }
]

export const useGoals = create<GoalsState>()(
  persist(
    (set) => ({
      goals: seed,
      add: (goal) => set((state) => ({ 
        goals: [{ id: generateId(), ...goal }, ...state.goals] 
      })),
      update: (id, patch) =>
        set((state) => ({ 
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) 
        })),
      remove: (id) => set((state) => ({ 
        goals: state.goals.filter((g) => g.id !== id) 
      })),
      updateProgress: (id, progress) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? { ...g, progress: Math.max(0, Math.min(100, progress)) }
              : g
          )
        }))
    }),
    { name: 'ai-life-goals' }
  )
) 