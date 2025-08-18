import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReadingItem } from '@/types/core'
import { readingApi } from '@/lib/api'

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

const seed: ReadingItem[] = []

export const useReadingList = create<ReadingListState>()(
  persist(
    (set, get) => {
      ;(async () => {
        try {
          const list = await readingApi.getAll()
          set({ items: list as any })
        } catch (e) {
          console.warn('Reading list load failed, using local data')
        }
      })()

      return {
        items: seed,
        add: async (item) => {
          const tempId = generateId()
          set((state) => ({ items: [{ id: tempId, ...(item as any) }, ...state.items] }))
          try {
            const created = await readingApi.create(item as any)
            set((state) => ({ items: state.items.map(i => i.id === tempId ? (created as any) : i) }))
          } catch (e) {
            set((state) => ({ items: state.items.filter(i => i.id !== tempId) }))
          }
        },
        update: async (id, patch) => {
          const prev = get().items
          set({ items: prev.map(i => i.id === id ? { ...i, ...patch } : i) })
          try {
            const updated = await readingApi.update(id, patch as any)
            set((state) => ({ items: state.items.map(i => i.id === id ? (updated as any) : i) }))
          } catch (e) {
            set({ items: prev })
          }
        },
        remove: async (id) => {
          const prev = get().items
          set({ items: prev.filter(i => i.id !== id) })
          try {
            await readingApi.delete(id)
          } catch (e) {
            set({ items: prev })
          }
        },
        markAsReading: async (id) => {
          const prev = get().items
          set({ items: prev.map(i => i.id === id ? { ...i, status: 'reading' } : i) })
          try {
            const updated = await readingApi.markAsReading(id)
            set((state) => ({ items: state.items.map(i => i.id === id ? (updated as any) : i) }))
          } catch (e) {
            set({ items: prev })
          }
        },
        markAsCompleted: async (id, notes) => {
          const prev = get().items
          set({ items: prev.map(i => i.id === id ? { ...i, status: 'completed', completed_date: new Date().toISOString().slice(0,10), notes: notes || i.notes } : i) })
          try {
            const updated = await readingApi.markAsCompleted(id, notes)
            set((state) => ({ items: state.items.map(i => i.id === id ? (updated as any) : i) }))
          } catch (e) {
            set({ items: prev })
          }
        },
      }
    },
    { name: 'ai-life-reading' }
  )
)