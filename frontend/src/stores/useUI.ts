import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ModulePickerSize {
  width: number
  height: number
}

interface ModulePickerOffset {
  x: number
  y: number
}

interface ModulePickerPos {
  left: number
  top: number
  hasPos: boolean
}

interface UIState {
  modulePickerSize: ModulePickerSize
  modulePickerOffset: ModulePickerOffset
  modulePickerPos: ModulePickerPos
  setModulePickerSize: (size: Partial<ModulePickerSize>) => void
  setModulePickerOffset: (offset: Partial<ModulePickerOffset>) => void
  setModulePickerPos: (pos: Partial<ModulePickerPos>) => void
}

function clampSize(size: Partial<ModulePickerSize>): ModulePickerSize {
  const w = Math.max(360, Math.min(1200, Math.round(size.width ?? 520)))
  const h = Math.max(260, Math.min(1000, Math.round(size.height ?? 420)))
  return { width: w, height: h }
}

function clampOffset(offset: Partial<ModulePickerOffset>): ModulePickerOffset {
  const x = Math.max(-2000, Math.min(2000, Math.round(offset.x ?? 0)))
  const y = Math.max(-1200, Math.min(1200, Math.round(offset.y ?? 0)))
  return { x, y }
}

function clampPos(pos: Partial<ModulePickerPos>): ModulePickerPos {
  const left = Math.max(-2000, Math.min(4000, Math.round(pos.left ?? 0)))
  const top = Math.max(-2000, Math.min(4000, Math.round(pos.top ?? 0)))
  const hasPos = !!pos.hasPos
  return { left, top, hasPos }
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      modulePickerSize: { width: 520, height: 420 },
      modulePickerOffset: { x: 0, y: 0 },
      modulePickerPos: { left: 0, top: 0, hasPos: false },
      setModulePickerSize: (size) =>
        set((state) => ({ modulePickerSize: clampSize({ ...state.modulePickerSize, ...size }) })),
      setModulePickerOffset: (offset) =>
        set((state) => ({ modulePickerOffset: clampOffset({ ...state.modulePickerOffset, ...offset }) })),
      setModulePickerPos: (pos) =>
        set((state) => ({ modulePickerPos: clampPos({ ...state.modulePickerPos, ...pos }) })),
    }),
    { name: 'ai-life-ui' }
  )
) 