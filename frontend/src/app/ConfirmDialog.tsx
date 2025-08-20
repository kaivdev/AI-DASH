import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') onCancel()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') onConfirm()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  const node = (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-none">
        <div className="w-full max-w-md rounded-lg border bg-background shadow-xl pointer-events-auto">
          <div className="px-5 pt-3 pb-4">
            <h3 className="text-xl font-semibold">{title}</h3>
            {description && (
              <p className="mt-2 text-base text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="mt-2 border-t" />
          <div className="p-5 flex items-center justify-end gap-2">
            <button
              className="py-3 px-6 rounded border text-lg"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              className={`py-3 px-6 rounded border text-lg text-primary-foreground ${
                variant === 'danger' ? 'bg-red-600 border-red-600' : 'bg-primary border-primary'
              }`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
} 