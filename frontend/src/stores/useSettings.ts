import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  gridRowHeight: number // px
  setGridRowHeight: (px: number) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      gridRowHeight: 220,
      setGridRowHeight: (px) => set({ gridRowHeight: Math.max(140, Math.min(480, Math.round(px))) }),
    }),
    { name: 'ai-life-settings' }
  )
) 