import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleKey } from '@/features/modules/registry'

interface ModulePosition {
  x: number
  y: number
  width: number
  height: number
}

interface GridPosition {
  gridX: number
  gridY: number
}

export type EnabledModule = { 
  key: ModuleKey; 
  size: '1x1' | '2x1' | '2x2' | '3x1' | '3x2'; 
  order: number; 
  rowSpan?: number;
  lastPosition?: ModulePosition;
  gridPosition?: GridPosition;
}

type Direction = 'up' | 'down'

interface ModulesState {
  enabled: EnabledModule[]
  disabled: EnabledModule[]
  enable: (key: ModuleKey) => void
  disable: (key: ModuleKey) => void
  resize: (key: ModuleKey, size: EnabledModule['size']) => void
  setRowSpan: (key: ModuleKey, units: number) => void
  savePosition: (key: ModuleKey, pos: ModulePosition) => void
  saveGridPosition: (key: ModuleKey, gridPos: GridPosition) => void
  reorder: (key: ModuleKey, dir: Direction) => void
  setOrder: (list: EnabledModule[]) => void
}

function defaultSizeFor(key: ModuleKey): EnabledModule['size'] {
  if (key === 'finance' || key === 'employees' || key === 'projects' || key === 'goals' || key === 'reading' || key === 'metrics') return '2x2'
  if (key === 'notes' || key === 'tasks') return '2x1'
  return '1x1'
}

function defaultRowSpanForSize(size: EnabledModule['size']): number {
  if (size === '2x2' || size === '3x2') return 2
  return 1
}

export const useModules = create<ModulesState>()(
  persist(
    (set, get) => ({
      enabled: [
        // Новый дефолтный порядок: задачи, проекты, финансы, сотрудники, цели, ридинг лист, заметки, метрики
        { key: 'tasks', size: '2x2', order: 0, rowSpan: 2 },
        { key: 'projects', size: '2x2', order: 1, rowSpan: 2 },
        { key: 'finance', size: '2x2', order: 2, rowSpan: 2 },
        { key: 'employees', size: '2x2', order: 3, rowSpan: 2 },
        { key: 'goals', size: '2x2', order: 4, rowSpan: 2 },
  { key: 'reading', size: '2x2', order: 5, rowSpan: 2 },
  { key: 'notes', size: '2x2', order: 6, rowSpan: 2 },
        { key: 'metrics', size: '2x2', order: 7, rowSpan: 2 },
      ],
      disabled: [],
      enable: (key) =>
        set((state) => {
          if (state.enabled.some((m) => m.key === key)) return state
          // Check if this module was previously disabled
          const wasDisabled = state.disabled.find((m) => m.key === key)
          const newDisabled = state.disabled.filter((m) => m.key !== key)
          
          if (wasDisabled) {
            // Restore from disabled with preserved settings
            // Try to restore original order if gridPosition exists, otherwise add at end
            let order = state.enabled.length ? Math.max(...state.enabled.map((m) => m.order)) + 1 : 0
            if (wasDisabled.gridPosition) {
              // Try to insert at approximate original position
              const targetOrder = wasDisabled.gridPosition.gridY * 10 + wasDisabled.gridPosition.gridX
              order = Math.max(0, Math.min(targetOrder, state.enabled.length))
            }
            return { 
              enabled: [...state.enabled, { ...wasDisabled, order }],
              disabled: newDisabled
            }
          } else {
            // First time enabling
            const order = state.enabled.length ? Math.max(...state.enabled.map((m) => m.order)) + 1 : 0
            const size = defaultSizeFor(key)
            return { 
              enabled: [...state.enabled, { key, size, order, rowSpan: defaultRowSpanForSize(size) }],
              disabled: newDisabled
            }
          }
        }),
      disable: (key) => 
        set((state) => {
          const module = state.enabled.find((m) => m.key === key)
          if (!module) return state
          return { 
            enabled: state.enabled.filter((m) => m.key !== key),
            disabled: [...state.disabled.filter((m) => m.key !== key), module]
          }
        }),
      resize: (key, size) =>
        set((state) => ({
          enabled: state.enabled.map((m) =>
            m.key === key
              ? { ...m, size, rowSpan: m.rowSpan ?? defaultRowSpanForSize(size) }
              : m
          ),
        })),
      setRowSpan: (key, units) =>
        set((state) => ({
          enabled: state.enabled.map((m) => (m.key === key ? { ...m, rowSpan: Math.max(1, Math.min(4, Math.round(units))) } : m)),
        })),
      savePosition: (key, pos) =>
        set((state) => ({
          enabled: state.enabled.map((m) => (m.key === key ? { ...m, lastPosition: pos } : m)),
          disabled: state.disabled.map((m) => (m.key === key ? { ...m, lastPosition: pos } : m)),
        })),
      saveGridPosition: (key, gridPos) =>
        set((state) => ({
          enabled: state.enabled.map((m) => (m.key === key ? { ...m, gridPosition: gridPos } : m)),
          disabled: state.disabled.map((m) => (m.key === key ? { ...m, gridPosition: gridPos } : m)),
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
    {
      name: 'ai-life-modules',
      version: 2,
      migrate: (persisted: any, fromVersion: number) => {
        if (!persisted) return persisted
        if (fromVersion >= 2) return persisted

        // Support both wrapped ({ state, version }) and flat shapes
        const hasWrapper = persisted && typeof persisted === 'object' && 'state' in persisted && persisted.state
        const base: any = hasWrapper ? { ...(persisted.state || {}) } : { ...persisted }

        if (!Array.isArray(base.enabled)) return persisted

        const desiredOrder: ModuleKey[] = [
          'tasks',
          'projects',
          'finance',
          'employees',
          'goals',
          'reading',
          'notes',
          'metrics',
        ]

        const byKey = new Map<ModuleKey, EnabledModule>()
        for (const m of base.enabled as EnabledModule[]) {
          byKey.set(m.key, m)
        }

        const result: EnabledModule[] = []
        // Place desired in fixed order, if present
          for (const key of desiredOrder) {
          const m = byKey.get(key)
          if (!m) continue
          // Ensure metrics and notes have 2x2 size and rowSpan 2
          if (key === 'metrics' || key === 'notes') {
            const size = '2x2'
            const rowSpan = Math.max(2, m.rowSpan ?? 2)
            result.push({ ...m, size, rowSpan })
          } else {
            result.push(m)
          }
          byKey.delete(key)
        }
        // Append any other remaining modules preserving their relative order
        const leftovers = (base.enabled as EnabledModule[]).filter((m) => byKey.has(m.key))
        for (const m of leftovers) result.push(m)

        // Reassign order sequentially
        const reOrdered = result.map((m, idx) => ({ ...m, order: idx }))
        base.enabled = reOrdered

        if (hasWrapper) {
          return { ...persisted, state: base }
        }
        return base
      },
    }
  )
) 