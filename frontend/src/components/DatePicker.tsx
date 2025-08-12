import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { CalendarDays, X } from 'lucide-react'
import 'react-day-picker/dist/style.css'

function toDate(value?: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function toISO(date?: Date): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Выбрать дату',
  className = '',
  disabled,
}: {
  value?: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const selected = toDate(value)
  const [open, setOpen] = React.useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={
            `h-9 px-3 rounded border bg-background text-sm w-full flex items-center justify-between ${className}`
          }
        >
          <span className={value ? '' : 'text-muted-foreground'}>
            {value || placeholder}
          </span>
          <CalendarDays className="h-4 w-4 opacity-70" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={8}
          avoidCollisions
          collisionPadding={8}
          updatePositionStrategy="always"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="rounded-md border bg-popover p-2 shadow-md z-50"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <div className="text-xs text-muted-foreground">Выберите дату</div>
            {value && (
              <button
                className="h-7 w-7 rounded border inline-flex items-center justify-center"
                onClick={() => { onChange(''); setOpen(false) }}
                title="Очистить"
                aria-label="Очистить"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => { onChange(toISO(d)); setOpen(false) }}
            ISOWeek
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
} 