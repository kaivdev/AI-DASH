import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Note } from '@/types/core'

interface NotesState {
  notes: Note[]
  add: (note: Omit<Note, 'id'>) => void
  update: (id: string, patch: Partial<Omit<Note, 'id'>>) => void
  remove: (id: string) => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const seed: Note[] = [
  {
    id: generateId(),
    date: new Date().toISOString().slice(0, 10),
    title: 'Welcome',
    content: 'This is your first note. You can edit or delete it.',
    tags: ['info'],
  },
  {
    id: generateId(),
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    title: 'Ideas',
    content: 'Try adding a Tasks module and track your day.',
    tags: ['ideas'],
  },
  {
    id: generateId(),
    date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    content: 'Finance module will help monitor monthly balance.',
    tags: [],
  },
]

export const useNotes = create<NotesState>()(
  persist(
    (set) => ({
      notes: seed,
      add: (note) =>
        set((state) => ({
          notes: [{ id: generateId(), ...note }, ...state.notes],
        })),
      update: (id, patch) =>
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),
      remove: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),
    }),
    { name: 'ai-life-notes' }
  )
) 