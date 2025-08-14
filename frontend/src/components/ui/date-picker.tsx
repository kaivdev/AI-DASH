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
  return (
    <AntdDatePicker
      value={toDayjs(date)}
      format="DD.MM.YYYY"
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      onChange={(d) => onDateChange?.(d ? d.toDate() : undefined)}
    />
  )
} 