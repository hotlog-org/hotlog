import { ChartColors } from './chart.types'

export const getDefaultColors = (): string[] => {
  if (typeof window !== 'undefined') {
    const style = getComputedStyle(document.documentElement)
    return [
      style.getPropertyValue('--chart-1').trim(),
      style.getPropertyValue('--chart-2').trim(),
      style.getPropertyValue('--chart-3').trim(),
      style.getPropertyValue('--chart-4').trim(),
      style.getPropertyValue('--chart-5').trim(),
      style.getPropertyValue('--chart-6').trim(),
      style.getPropertyValue('--chart-7').trim(),
      style.getPropertyValue('--chart-8').trim(),
      style.getPropertyValue('--chart-9').trim(),
      style.getPropertyValue('--chart-10').trim(),
    ]
  }
  return [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#06b6d4',
    '#f43f5e',
    '#6366f1',
    '#14b8a6',
    '#a855f7',
  ]
}

export const getChartColors = (colors?: ChartColors): string[] => {
  if (colors?.colors && colors.colors.length > 0) {
    return colors.colors
  }
  return getDefaultColors()
}

export const getBorderRadius = (): number => {
  if (typeof window !== 'undefined') {
    const style = getComputedStyle(document.documentElement)
    const radius = style.getPropertyValue('--radius').trim()
    return parseFloat(radius) * 16
  }
  return 6
}

export const getThemeColors = () => {
  if (typeof window !== 'undefined') {
    const style = getComputedStyle(document.documentElement)
    return {
      background: style.getPropertyValue('--background').trim(),
      foreground: style.getPropertyValue('--foreground').trim(),
      border: style.getPropertyValue('--border').trim(),
      muted: style.getPropertyValue('--muted-foreground').trim(),
    }
  }
  return {
    background: '#ffffff',
    foreground: '#0a0a0a',
    border: '#e5e5e5',
    muted: '#737373',
  }
}

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const filterDataByDateRange = <T extends { date: Date | string }>(
  data: T[],
  from?: Date,
  to?: Date,
): T[] => {
  if (!from && !to) return data

  return data.filter((item) => {
    const itemDate =
      typeof item.date === 'string' ? new Date(item.date) : item.date
    if (from && itemDate < from) return false
    if (to && itemDate > to) return false
    return true
  })
}
