import * as React from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

// Set dayjs to use Russian locale
dayjs.locale('ru')

interface Props {
  date?: Date
  onDateChange?: (date?: Date) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ date, onDateChange, placeholder, className, disabled }: Props) {
  const [open, setOpen] = React.useState(false)
  const label = date ? dayjs(date).format('DD MMMM YYYY') : (placeholder ?? 'Выберите дату')

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={className ? `${className} justify-between font-normal` : 'w-full justify-between font-normal'}
          disabled={disabled}
        >
          {label}
          <ChevronDownIcon className="ml-2 size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={() => setOpen(false)}
      >
        <Calendar
          mode="single"
          selected={date}
          captionLayout="dropdown"
          onSelect={(d) => {
            onDateChange?.(d)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}