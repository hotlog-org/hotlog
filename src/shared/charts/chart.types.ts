import type { DateRange } from 'react-day-picker'

// Re-export DateRange for convenience
export type { DateRange }

export interface BaseChartData {
  name: string
  value: number | string
}

export interface TimeSeriesData {
  date: Date | string
  value: number
  category?: string
}

export interface MultiSeriesData {
  name: string
  values: number[]
}

export interface ScatterData {
  x: number | string
  y: number
  size?: number
  category?: string
}

export interface HeatmapData {
  x: string | number
  y: string | number
  value: number
}

export interface TimelineData {
  name: string
  start: Date | string
  end: Date | string
  category?: string
}

export interface ChartColors {
  primary?: string
  secondary?: string
  accent?: string
  colors?: string[]
}

export interface BaseChartProps {
  height?: number | string
  width?: number | string
  colors?: ChartColors
  startDate?: Date
  endDate?: Date
  autoUpdate?: boolean
  updateInterval?: number
  className?: string
}
