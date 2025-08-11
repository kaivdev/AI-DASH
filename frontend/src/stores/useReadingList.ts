import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReadingItem } from '@/types/core'

interface ReadingListState {
  items: ReadingItem[]
  add: (item: Omit<ReadingItem, 'id'>) => void
  update: (id: string, patch: Partial<Omit<ReadingItem, 'id'>>) => void
  remove: (id: string) => void
  markAsReading: (id: string) => void
  markAsCompleted: (id: string, notes?: string) => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const seed: ReadingItem[] = [
  {
    id: generateId(),
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    type: 'book',
    status: 'to_read',
    priority: 'H',
    tags: ['programming', 'best-practices'],
    addedDate: new Date().toISOString().slice(0, 10)
  },
  {
    id: generateId(),
    title: 'React 18 Performance Optimization',
    url: 'https://example.com/react-performance',
    type: 'article',
    status: 'reading',
    priority: 'M',
    tags: ['react', 'performance'],
    addedDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    notes: 'Интересные техники мемоизации'
  },
  {
    id: generateId(),
    title: 'TypeScript Advanced Patterns',
    url: 'https://youtube.com/watch?v=example',
    type: 'video',
    status: 'completed',
    priority: 'H',
    tags: ['typescript', 'patterns'],
    addedDate: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
    completedDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    notes: 'Очень полезно для работы с дженериками'
  }
]

export const useReadingList = create<ReadingListState>()(
  persist(
    (set) => ({
      items: seed,
      add: (item) => set((state) => ({ 
        items: [{ id: generateId(), ...item }, ...state.items] 
      })),
      update: (id, patch) =>
        set((state) => ({ 
          items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) 
        })),
      remove: (id) => set((state) => ({ 
        items: state.items.filter((i) => i.id !== id) 
      })),
      markAsReading: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, status: 'reading' } : i
          )
        })),
      markAsCompleted: (id, notes) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id 
              ? { 
                  ...i, 
                  status: 'completed', 
                  completedDate: new Date().toISOString().slice(0, 10),
                  notes: notes || i.notes
                } 
              : i
          )
        }))
    }),
    { name: 'ai-life-reading' }
  )
) 