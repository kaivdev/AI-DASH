import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  gridRowHeight: number // px
  setGridRowHeight: (px: number) => void
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  autoAlign: boolean
  setAutoAlign: (v: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      gridRowHeight: 220,
      setGridRowHeight: (px) => set({ gridRowHeight: Math.max(140, Math.min(480, Math.round(px))) }),
      theme: 'dark',
      setTheme: (t) => set({ theme: t }),
      autoAlign: true,
      setAutoAlign: (v) => set({ autoAlign: !!v }),
    }),
    { name: 'ai-life-settings' }
  )
) 