import * as React from 'react'
import { cn } from '@/lib/utils'
import { Legend as RechartsLegend, Tooltip as RechartsTooltip } from 'recharts'

export type ChartConfig = Record<string, { label?: string; color?: string }>

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig
}

// Provides CSS variables like --color-income for each series and a styled container
export function ChartContainer({ config, className, children, ...rest }: ChartContainerProps) {
  const styleVars: React.CSSProperties = {}
  for (const [key, val] of Object.entries(config)) {
    ;(styleVars as any)[`--color-${key}`] = val.color || 'hsl(222.2 47.4% 11.2%)'
  }
  return (
    <div
      className={cn('relative h-full w-full', className)}
      style={styleVars}
      {...rest}
    >
      {children}
    </div>
  )
}

// Tooltip wrapper to keep a consistent API with shadcn examples
export function ChartTooltip(props: React.ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} />
}

export function ChartTooltipContent(props: {
  indicator?: 'line' | 'dot'
  className?: string
  active?: boolean
  label?: any
  payload?: any[]
}) {
  const { indicator = 'line', className, active, label, payload } = props
  if (!active || !payload?.length) return null
  return (
    <div className={cn('rounded-md border bg-popover p-2 text-sm shadow-sm', className)}>
      {label && <div className="mb-1 text-xs text-muted-foreground">{label}</div>}
      <div className="space-y-1">
        {payload.map((item: any, idx: number) => {
          const color = item.color || item.stroke || '#8884d8'
          const name = item.name
          const raw = item.value
          const val = typeof raw === 'number' ? Math.round(raw) : raw
          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn('inline-block', indicator === 'dot' ? 'h-2 w-2 rounded-full' : 'h-2 w-3')}
                  style={{ backgroundColor: color }}
                />
                <span className="text-foreground/80">{name}</span>
              </div>
              <span className="font-medium">{val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartLegend(props: any) {
  return <RechartsLegend {...props} />
}

export function ChartLegendContent(props: any) {
  const { className, config = {}, payload } = props
  if (!payload?.length) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-xs', className)}>
      {payload.map((item: any, idx: number) => {
        const key = item.dataKey as string
        const color = item.color || `var(--color-${key})`
        const label = config[key]?.label || item.value || key
        return (
          <div key={idx} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export type ChartLegendProps = React.ComponentProps<typeof RechartsLegend>
export type ChartTooltipProps = React.ComponentProps<typeof RechartsTooltip>
