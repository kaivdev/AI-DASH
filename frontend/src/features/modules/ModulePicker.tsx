import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { registry, ModuleKey } from './registry'
import { useModules } from '@/stores/useModules'
import { useUI } from '@/stores/useUI'
import { Checkbox } from '@/components/ui/checkbox'

export function ModulePicker() {
  const enabled = useModules((s) => s.enabled)
  const enable = useModules((s) => s.enable)
  const disable = useModules((s) => s.disable)

  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const { modulePickerSize, modulePickerPos, setModulePickerSize, setModulePickerPos } = useUI()

  // Position panel on first open only
  useLayoutEffect(() => {
    if (!open || modulePickerPos.hasPos) return
    const btn = btnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const left = Math.round(rect.left + window.scrollX)
    const top = Math.round(rect.top + window.scrollY + rect.height + 8)
    setModulePickerPos({ left, top, hasPos: true })
  }, [open, modulePickerPos.hasPos, setModulePickerPos])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDocPointerDown(ev: PointerEvent) {
      const target = ev.target as Node
      if (panelRef.current?.contains(target)) return
      if (btnRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [open])

  // Drag to move by header
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const header = panel.querySelector('[data-role="mp-header"]') as HTMLElement | null
    if (!header) return
    
    let dragging = false
    let startX = 0
    let startY = 0
    let startLeft = 0
    let startTop = 0

    function onDown(e: PointerEvent) {
      if (!header) return
      e.preventDefault()
      dragging = true
      startX = e.clientX
      startY = e.clientY
      // Get current position from the store to ensure we have the latest values
      const currentPos = useUI.getState().modulePickerPos
      startLeft = currentPos.left
      startTop = currentPos.top
      header.setPointerCapture?.(e.pointerId)
    }
    
    function onMove(e: PointerEvent) {
      if (!dragging) return
      e.preventDefault()
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      setModulePickerPos({ 
        left: startLeft + dx, 
        top: startTop + dy, 
        hasPos: true 
      })
    }
    
    function onUp(e: PointerEvent) {
      if (!dragging) return
      dragging = false
      header?.releasePointerCapture?.(e.pointerId)
    }

    header.addEventListener('pointerdown', onDown)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    
    return () => {
      header.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [open, setModulePickerPos])

  // Simple resize observer - only save size, don't interfere with position
  useEffect(() => {
    if (!open) return
    const el = panelRef.current
    if (!el) return
    
    let rafId: number | null = null
    
    const ro = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const w = Math.max(360, Math.round(rect.width))
        const h = Math.max(260, Math.round(rect.height))
        setModulePickerSize({ width: w, height: h })
      })
    })
    
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [open, setModulePickerSize])

  const enabledKeys = new Set(enabled.map((m) => m.key))
  const width = Math.max(360, modulePickerSize.width)
  const height = Math.max(260, modulePickerSize.height)

  function handleToggle() {
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        className="h-8 px-3 rounded border bg-background"
        onClick={handleToggle}
        title="Модули"
      >
        Модули
      </button>

      {open && (
        <div 
          className="fixed z-40" 
          style={{ 
            left: modulePickerPos.left, 
            top: modulePickerPos.top,
            pointerEvents: 'auto'
          }}
        >
          <div
            ref={panelRef}
            className="rounded-lg border bg-popover shadow-lg resize overflow-auto"
            style={{ width, height, maxWidth: '95vw', maxHeight: '90vh' }}
          >
            <div 
              className="flex items-center justify-between px-4 py-3 border-b cursor-move select-none bg-muted/50" 
              data-role="mp-header"
            >
              <div className="font-medium">Модули</div>
              <div className="text-xs text-muted-foreground">Переместите заголовок • Потяните угол</div>
            </div>
            <div className="p-4 space-y-2">
              {Object.keys(registry).map((key) => {
                const k = key as ModuleKey
                const isOn = enabledKeys.has(k)
                return (
                  <label key={k} className="flex items-center justify-between rounded border px-3 py-2 hover:bg-muted/30">
                    <div className="font-medium capitalize">{k}</div>
                    <Checkbox checked={isOn} onCheckedChange={() => (isOn ? disable(k) : enable(k))} />
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 