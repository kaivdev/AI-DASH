import React from 'react'
import { DatePicker as AntdDatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'

interface Props {
  date?: Date
  onDateChange?: (d: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function toDayjs(value?: Date): Dayjs | undefined {
  if (!value) return undefined
  return dayjs(value)
}

export function DatePicker({ date, onDateChange, placeholder, className, disabled }: Props) {
  const base = 'h-9 px-3 rounded border bg-background text-sm w-full'
  
  return (
    <AntdDatePicker
      value={toDayjs(date)}
      defaultPickerValue={toDayjs(date) || dayjs()}
      format="DD.MM.YYYY"
      placeholder={placeholder}
      className={className ? `${base} ${className}` : base}
      disabled={disabled}
      allowClear
      preserveInvalidOnBlur={false}
      onChange={(d) => {
        // Вызываем callback только при реальном выборе даты
        onDateChange?.(d ? d.toDate() : undefined)
      }}
    />
  )
}