import * as React from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

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
  placeholder = "Выбрать дату",
  className = "",
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
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            className
          )}
        >
          {selected ? (
            format(selected, "dd.MM.yyyy", { locale: ru })
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-auto p-0 bg-popover border rounded-md shadow-md z-50"
          align="start"
          side="bottom"
          sideOffset={8}
          avoidCollisions
          collisionPadding={8}
          updatePositionStrategy="always"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(toISO(date))
              setOpen(false)
            }}
            locale={{ ...ru, options: { ...ru.options, weekStartsOn: 1 } }}
            ISOWeek
            initialFocus
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-2",
              caption: "relative flex items-center px-15 pt-4 pb-1",
              caption_label: "mx-auto mt-1 text-sm font-medium capitalize pl-10 pr-10",
              nav: "absolute inset-y-0 left-4 right-4 flex items-center justify-between",
              nav_button: cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
              ),
              table: "w-full border-collapse",
              // header
              weekdays: "grid grid-cols-4 px-6",
              weekday: "flex items-center justify-center h-9 w-9 mx-auto text-muted-foreground text-center font-medium text-[0.9rem] select-none",
              // body
              row: "grid grid-cols-7 px-6",
              cell: cn(
                "p-0 text-center"
              ),
              day: cn(
                "mx-auto inline-flex items-center justify-center rounded-md text-sm font-normal ring-offset-background transition-colors",
                "h-9 w-9 p-0 font-normal",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              ),
              day_range_end: "day-range-end",
              day_selected: cn(
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
              ),
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
} 