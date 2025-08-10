import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  gridRowHeight: number // px
}

export const useSettings = create<SettingsState>()(
  persist(
    () => ({ gridRowHeight: 220 }),
    { name: 'ai-life-settings' }
  )
) 