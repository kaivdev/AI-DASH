import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Note } from '@/types/core'
import { noteApi } from '@/lib/api'

interface NotesState {
  notes: Note[]
  add: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void
  update: (id: string, patch: Partial<Omit<Note, 'id'>>) => void
  remove: (id: string) => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Initial state is empty; we hydrate from backend on init
const seed: Note[] = []

export const useNotes = create<NotesState>()(
  persist(
    (set, get) => {
      // Kick off initial load from backend (non-blocking)
      ;(async () => {
        try {
          const list = await noteApi.getAll()
          set({ notes: list as any })
        } catch (e) {
          // keep local if offline
          console.warn('Notes load failed, using local data')
        }
      })()

      return {
        notes: seed,
        add: async (note) => {
          // Optimistic add
          const tempId = generateId()
          const optimistic: Note = { id: tempId, created_at: new Date().toISOString(), updated_at: undefined, title: undefined, ...note } as any
          set((state) => ({ notes: [optimistic, ...state.notes] }))
          try {
            const created = await noteApi.create(note as any)
            set((state) => ({ notes: state.notes.map(n => n.id === tempId ? (created as any) : n) }))
          } catch (e) {
            // rollback
            set((state) => ({ notes: state.notes.filter(n => n.id !== tempId) }))
          }
        },
        update: async (id, patch) => {
          // Optimistic update
          const prev = get().notes
          set({ notes: prev.map(n => n.id === id ? { ...n, ...patch } : n) })
          try {
            const updated = await noteApi.update(id, patch as any)
            set((state) => ({ notes: state.notes.map(n => n.id === id ? (updated as any) : n) }))
          } catch (e) {
            // revert
            set({ notes: prev })
          }
        },
        remove: async (id) => {
          const prev = get().notes
          set({ notes: prev.filter(n => n.id !== id) })
          try {
            await noteApi.delete(id)
          } catch (e) {
            // revert on failure
            set({ notes: prev })
          }
        },
      }
    },
    { name: 'ai-life-notes' }
  )
) 