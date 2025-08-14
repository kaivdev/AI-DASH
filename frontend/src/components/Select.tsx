import * as React from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

export type SelectOption = { label: string; value: string }

const INTERNAL_CLEAR = '__CLEAR__'

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Выбрать...',
  className = '',
  disabled,
}: {
  value?: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const clearLabel = React.useMemo(() => options.find(o => o.value === '')?.label, [options])
  const computedPlaceholder = value ? undefined : (clearLabel || placeholder)

  const handleChange = (next: string) => {
    if (next === INTERNAL_CLEAR) onChange('')
    else onChange(next)
  }

  return (
    <RadixSelect.Root value={value} onValueChange={handleChange} disabled={disabled}>
      <RadixSelect.Trigger
        className={`h-9 w-full inline-flex items-center justify-between gap-2 rounded border bg-background px-3 text-sm min-w-0 overflow-hidden whitespace-nowrap text-ellipsis ${className}`}
        aria-label={computedPlaceholder || placeholder}
      >
        <RadixSelect.Value placeholder={<span className="text-muted-foreground">{computedPlaceholder || placeholder}</span>} />
        <RadixSelect.Icon>
          <ChevronDown className="h-4 w-4 opacity-70 flex-shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className="z-50 overflow-hidden rounded-md border bg-popover shadow-md">
          <RadixSelect.ScrollUpButton className="flex items-center justify-center py-1">
            <ChevronUp className="h-4 w-4" />
          </RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => {
              const itemValue = opt.value === '' ? INTERNAL_CLEAR : opt.value
              return (
                <RadixSelect.Item
                  key={`${opt.value}__item`}
                  value={itemValue}
                  className={`relative flex select-none items-center rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground`}
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2 inline-flex items-center">
                    <Check className="h-4 w-4" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              )
            })}
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="flex items-center justify-center py-1">
            <ChevronDown className="h-4 w-4" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
} 