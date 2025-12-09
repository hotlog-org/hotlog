'use client'

import { useMemo, useState } from 'react';

export type TimePoint = { date: Date; value: number }
export type StatusSlice = { name: string; value: number }
export type HeatmapCell = { x: string; y: string; value: number }

export const useLandingService = (translations?: Record<string, string>) => {
  const t = (k: string) => translations?.[k] ?? k

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined)

  const timeSeries: TimePoint[] = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      date: new Date(Date.now() - (11 - i) * 24 * 60 * 60 * 1000),
      value: 120 + Math.round(Math.sin(i / 2) * 40) + i * 2,
    }))
  }, [])

  const status: StatusSlice[] = useMemo(
    () => [
      { name: '2xx', value: 72 },
      { name: '4xx', value: 18 },
      { name: '5xx', value: 10 },
    ],
    []
  )

  const heatmap: HeatmapCell[] = useMemo(() => {
    return Array.from({ length: 7 * 6 }).map((_, idx) => ({
      x: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx % 7],
      y: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'][Math.floor(idx / 7)],
      value: 10 + ((idx * 7) % 50),
    }))
  }, [])

  return {
    t,
    dateRange,
    setDateRange,
    timeSeries,
    status,
    heatmap,
  }
}
