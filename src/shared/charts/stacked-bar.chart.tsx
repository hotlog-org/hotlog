'use client'

import React, { useEffect, useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { DateRangePicker } from '../ui/date-range-picker'
import {
  getChartColors,
  getThemeColors,
  filterDataByDateRange,
} from './chart.utils'
import type { BaseChartProps, TimeSeriesData, DateRange } from './chart.types'

export interface StackedBarChartProps extends BaseChartProps {
  data: TimeSeriesData[]
  showDatePicker?: boolean
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange) => void
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  horizontal?: boolean
}

export function StackedBarChart({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  width = '100%',
  colors,
  showDatePicker = false,
  dateRange: externalDateRange,
  onDateRangeChange,
  autoUpdate = false,
  updateInterval = 5000,
  horizontal = false,
  className = '',
}: StackedBarChartProps) {
  const [internalDateRange, setInternalDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  })
  const [, setUpdateTrigger] = useState(0)

  const dateRange = externalDateRange || internalDateRange
  const handleDateRangeChange = onDateRangeChange || setInternalDateRange

  useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1)
    }, updateInterval)

    return () => clearInterval(interval)
  }, [autoUpdate, updateInterval])

  const filteredData = useMemo(() => {
    return filterDataByDateRange(data, dateRange.from, dateRange.to)
  }, [data, dateRange.from, dateRange.to])

  const chartColors = getChartColors(colors)
  const themeColors = getThemeColors()

  const categories = useMemo(() => {
    return [
      ...new Set(filteredData.map((item) => item.category).filter(Boolean)),
    ]
  }, [filteredData])

  const { xAxisData, seriesData } = useMemo(() => {
    const uniqueDates = [
      ...new Set(
        filteredData.map((item) =>
          typeof item.date === 'string'
            ? new Date(item.date).getTime()
            : item.date.getTime(),
        ),
      ),
    ].sort()

    return {
      xAxisData: uniqueDates,
      seriesData: categories.map((category, index) => ({
        name: category,
        type: 'bar',
        stack: 'total',
        data: uniqueDates.map((date) => {
          const item = filteredData.find((d) => {
            const dTime =
              typeof d.date === 'string'
                ? new Date(d.date).getTime()
                : d.date.getTime()
            return dTime === date && d.category === category
          })
          return item ? item.value : 0
        }),
        emphasis: { focus: 'series' },
        color: chartColors[index % chartColors.length],
      })),
    }
  }, [filteredData, categories, chartColors])

  const option = {
    title: title
      ? {
          text: title,
          textStyle: { color: themeColors.foreground, fontSize: 16 },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
    },
    legend: {
      data: categories,
      textStyle: { color: themeColors.foreground },
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: title ? '15%' : '10%',
      containLabel: true,
    },
    xAxis: {
      type: horizontal ? 'value' : 'time',
      data: horizontal ? undefined : xAxisData,
      name: xAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { show: false },
    },
    yAxis: {
      type: horizontal ? 'time' : 'value',
      data: horizontal ? xAxisData : undefined,
      name: yAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { lineStyle: { color: themeColors.border, type: 'dashed' } },
    },
    series: seriesData,
  }

  return (
    <div className={className}>
      {showDatePicker && (
        <div className='mb-4 flex justify-end'>
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
        </div>
      )}
      <ReactECharts
        option={option}
        style={{ height, width }}
        notMerge
        lazyUpdate
      />
    </div>
  )
}
