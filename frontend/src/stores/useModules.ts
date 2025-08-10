import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleKey } from '@/features/modules/registry'

export type EnabledModule = { key: ModuleKey; size: '1x1' | '2x1' | '2x2'; order: number }

type Direction = 'up' | 'down'

interface ModulesState {
  enabled: EnabledModule[]
  enable: (key: ModuleKey) => void
  disable: (key: ModuleKey) => void
  resize: (key: ModuleKey, size: EnabledModule['size']) => void
  reorder: (key: ModuleKey, dir: Direction) => void
  setOrder: (list: EnabledModule[]) => void
}

export const useModules = create<ModulesState>()(
  persist(
    (set, get) => ({
      enabled: [{ key: 'metrics', size: '1x1', order: 0 }],
      enable: (key) =>
        set((state) => {
          if (state.enabled.some((m) => m.key === key)) return state
          const order = state.enabled.length ? Math.max(...state.enabled.map((m) => m.order)) + 1 : 0
          return { enabled: [...state.enabled, { key, size: '1x1', order }] }
        }),
      disable: (key) => set((state) => ({ enabled: state.enabled.filter((m) => m.key !== key) })),
      resize: (key, size) =>
        set((state) => ({
          enabled: state.enabled.map((m) => (m.key === key ? { ...m, size } : m)),
        })),
      reorder: (key, dir) =>
        set((state) => {
          const sorted = [...state.enabled].sort((a, b) => a.order - b.order)
          const idx = sorted.findIndex((m) => m.key === key)
          if (idx === -1) return state
          const swapIdx = dir === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= sorted.length) return state
          const a = sorted[idx]
          const b = sorted[swapIdx]
          ;[a.order, b.order] = [b.order, a.order]
          return { enabled: sorted }
        }),
      setOrder: (list) => set({ enabled: list }),
    }),
    { name: 'ai-life-modules' }
  )
) 