import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  title?: string
  widthClassName?: string
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
}

export function Drawer({ open, title, widthClassName = 'w-full max-w-lg', onClose, children, side = 'right' }: DrawerProps) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => setEntered(true))
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      // Do not toggle entered=false in cleanup to avoid StrictMode flicker
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const positionClass = side === 'right' ? 'right-0' : 'left-0'
  const borderSideClass = side === 'right' ? 'border-l' : 'border-r'
  const translateStartClass = side === 'right' ? 'translate-x-full' : '-translate-x-full'

  const node = (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${entered ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute inset-y-0 ${positionClass} flex max-w-full`}>
        <div
          className={`h-full ${widthClassName} bg-background ${borderSideClass} shadow-xl transform-gpu will-change-transform transform transition-transform duration-300 ease-out ${entered ? 'translate-x-0' : translateStartClass}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-base font-semibold truncate">{title}</h3>
              <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={onClose} aria-label="Закрыть">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto h-full">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 