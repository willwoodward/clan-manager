/**
 * Unified Chart Component
 *
 * Provides consistent chart styling across the application
 */

import { ReactNode } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ChartProps {
  data: any[]
  height?: number
  children?: ReactNode
}

interface LineChartProps extends ChartProps {
  dataKey: string
  stroke?: string
  strokeWidth?: number
  showDots?: boolean
  dotColor?: string
}

interface BarChartProps extends ChartProps {
  dataKeys: Array<{ key: string; color?: string; name?: string }>
}

interface AreaChartProps extends ChartProps {
  dataKey: string
  fill?: string
  stroke?: string
}

// Custom tooltip styling that matches the theme
const CustomTooltip = ({ active, payload, label, labelFormatter, formatter }: any) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      className="bg-background border border-border rounded-lg p-3 shadow-lg"
      style={{
        backgroundColor: 'hsl(var(--background))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div className="text-sm font-medium mb-2">
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {formatter ? formatter(entry.value, entry.name)[1] : entry.name}:
            </span>
            <span className="font-medium">
              {formatter ? formatter(entry.value, entry.name)[0] : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Unified Line Chart
 */
export function UnifiedLineChart({
  data,
  dataKey,
  height = 300,
  stroke = 'hsl(var(--primary))',
  strokeWidth = 2,
  showDots = true,
  dotColor,
  children,
}: LineChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => {
              if (!value) return ''
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
          />
          <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                labelFormatter={(label: string) => {
                  if (!label) return ''
                  return new Date(label).toLocaleDateString()
                }}
              />
            )}
          />
          {children && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={strokeWidth}
            dot={showDots ? { fill: dotColor || stroke, r: 3 } : false}
            activeDot={{ r: 5 }}
            name={dataKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Unified Bar Chart
 */
export function UnifiedBarChart({
  data,
  dataKeys,
  height = 300,
  children,
}: BarChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => {
              if (!value) return ''
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
          />
          <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                labelFormatter={(label: string) => {
                  if (!label) return ''
                  return new Date(label).toLocaleDateString()
                }}
              />
            )}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
          />
          {children}
          {dataKeys.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              fill={item.color || 'hsl(var(--primary))'}
              name={item.name || item.key}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Unified Area Chart
 */
export function UnifiedAreaChart({
  data,
  dataKey,
  height = 300,
  fill = 'hsl(var(--primary))',
  stroke = 'hsl(var(--primary))',
  children,
}: AreaChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => {
              if (!value) return ''
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
          />
          <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                labelFormatter={(label: string) => {
                  if (!label) return ''
                  return new Date(label).toLocaleDateString()
                }}
              />
            )}
          />
          {children}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            fill={fill}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
