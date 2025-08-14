import * as React from "react"
import { DatePicker as AntdDatePicker, Space, Typography } from "antd"
import dayjs from 'dayjs'

export function DatePickerExamples() {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Date Picker Examples (AntD)</h1>
        <p className="text-muted-foreground">
          Демонстрация выбора даты с помощью Ant Design
        </p>
      </div>

      <div className="grid gap-8">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Базовый Date Picker</h2>
            <p className="text-sm text-muted-foreground">
              Простой выбор даты
            </p>
          </div>
          <div className="space-y-2">
            <AntdDatePicker 
              placeholder="Выберите дату"
              format="DD.MM.YYYY"
              onChange={(d)=> setSelectedDate(d ? d.format('YYYY-MM-DD') : null)}
            />
            {selectedDate && (
              <p className="text-sm text-muted-foreground">
                Выбранная дата: {dayjs(selectedDate).format('DD.MM.YYYY')}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Диапазон дат</h2>
            <p className="text-sm text-muted-foreground">
              Выбор диапазона дат
            </p>
          </div>
          <Space direction="vertical">
            <AntdDatePicker.RangePicker format="DD.MM.YYYY" />
          </Space>
        </div>
      </div>
    </div>
  )
} 