import { useState, useEffect, useMemo } from 'react'
import { Clock, TrendingUp, DollarSign, BarChart3, Calendar, Filter } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { employeeApi } from '@/lib/api'
import type { Employee } from '@/types/core'
import { formatCurrency, formatHours, type EmployeeStatsAPI, type DateFilter } from './employeeUtils'

interface EmployeeStatsSectionProps {
  employee: Employee
}

export function EmployeeStatsSection({ employee }: EmployeeStatsSectionProps) {
  const [stats, setStats] = useState<EmployeeStatsAPI | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Date filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'custom' | 'all'>('all')
  
  // Convert dates to API format
  const dateFilter = useMemo((): DateFilter => {
    const toISOString = (date: Date) => date.toISOString().split('T')[0]
    
    if (periodType === 'all') {
      return {}
    }
    
    if (periodType === 'month') {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return {
        date_from: toISOString(start),
        date_to: toISOString(end),
        period_type: 'month'
      }
    }
    
    if (periodType === 'quarter') {
      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), quarter * 3, 1)
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
      return {
        date_from: toISOString(start),
        date_to: toISOString(end),
        period_type: 'quarter'
      }
    }
    
    if (periodType === 'custom' && dateFrom && dateTo) {
      return {
        date_from: toISOString(dateFrom),
        date_to: toISOString(dateTo),
        period_type: 'custom'
      }
    }
    
    return {}
  }, [periodType, dateFrom, dateTo])
  
  // Fetch statistics
  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await employeeApi.getStats(employee.id, dateFilter) as EmployeeStatsAPI
      setStats(result)
    } catch (err) {
      console.error('Failed to fetch employee stats:', err)
      setError('Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch stats when component mounts or filters change
  useEffect(() => {
    fetchStats()
  }, [employee.id, dateFilter])
  
  // Quick period presets
  const handleQuickPeriod = (type: 'month' | 'quarter' | 'all') => {
    setPeriodType(type)
    setDateFrom(undefined)
    setDateTo(undefined)
  }
  
  const handleCustomDateChange = () => {
    if (dateFrom && dateTo) {
      setPeriodType('custom')
    }
  }
  
  useEffect(() => {
    handleCustomDateChange()
  }, [dateFrom, dateTo])
  
  if (loading && !stats) {
    return (
      <div className="pt-4 border-t space-y-4">
        <div className="text-sm font-medium">Статистика</div>
        <div className="text-sm text-muted-foreground">Загрузка статистики...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="pt-4 border-t space-y-4">
        <div className="text-sm font-medium">Статистика</div>
        <div className="text-sm text-red-500">{error}</div>
        <Button onClick={fetchStats} size="sm" variant="outline">
          Повторить
        </Button>
      </div>
    )
  }
  
  if (!stats) return null
  
  return (
    <div className="pt-4 border-t space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Статистика</div>
        <div className="text-xs text-muted-foreground">{stats.period_label}</div>
      </div>
      
      {/* Date Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Период:</span>
        </div>
        
        {/* Quick period buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={periodType === 'all' ? 'default' : 'outline'}
            onClick={() => handleQuickPeriod('all')}
            className="h-7 text-xs"
          >
            Всё время
          </Button>
          <Button
            size="sm"
            variant={periodType === 'month' ? 'default' : 'outline'}
            onClick={() => handleQuickPeriod('month')}
            className="h-7 text-xs"
          >
            Текущий месяц
          </Button>
          <Button
            size="sm"
            variant={periodType === 'quarter' ? 'default' : 'outline'}
            onClick={() => handleQuickPeriod('quarter')}
            className="h-7 text-xs"
          >
            Текущий квартал
          </Button>
        </div>
        
        {/* Custom date range */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Произвольный период:</div>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              date={dateFrom}
              onDateChange={setDateFrom}
              placeholder="От"
              className="h-8 text-xs"
            />
            <DatePicker
              date={dateTo}
              onDateChange={setDateTo}
              placeholder="До"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded border bg-background">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Отработано часов
          </div>
          <div className="text-lg font-semibold">{formatHours(stats.total_hours)}</div>
        </div>
        
        <div className="p-3 rounded border bg-background">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            Принес прибыли
          </div>
          <div className="text-lg font-semibold text-green-600">{formatCurrency(stats.total_revenue)}</div>
        </div>

        <div className="p-3 rounded border bg-background">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3 w-3" />
            Расходы на ЗП
          </div>
          <div className="text-lg font-semibold text-orange-600">{formatCurrency(stats.total_salary_cost)}</div>
        </div>

        <div className="p-3 rounded border bg-background">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BarChart3 className="h-3 w-3" />
            Маржа прибыли
          </div>
          <div className="text-lg font-semibold">{stats.profit_margin.toFixed(1)}%</div>
        </div>
      </div>

      {/* Tasks Statistics */}
      <div>
        <div className="text-sm font-medium mb-2">Задачи за период</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded border bg-background text-center">
            <div className="text-lg font-semibold text-green-600">{stats.completed_tasks}</div>
            <div className="text-xs text-muted-foreground">Выполнено</div>
          </div>
          <div className="p-2 rounded border bg-background text-center">
            <div className="text-lg font-semibold text-blue-600">{stats.in_progress_tasks}</div>
            <div className="text-xs text-muted-foreground">В работе</div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div>
        <div className="text-sm font-medium mb-2">Дополнительно</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Стоимость часа:</span>
            <span>{formatCurrency(stats.actual_hourly_rate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Доходность в час:</span>
            <span>{formatCurrency(stats.revenue_per_hour)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Активных проектов:</span>
            <span>{stats.active_projects_count}</span>
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="text-xs text-muted-foreground text-center py-2">
          Обновление статистики...
        </div>
      )}
    </div>
  )
} 