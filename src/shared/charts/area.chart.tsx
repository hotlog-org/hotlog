'use client'

import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import type { BaseChartProps, TimeSeriesData } from './chart.types'
import {
  filterDataByDateRange,
  getChartColors,
  getThemeColors,
} from './chart.utils'

export interface AreaChartProps extends BaseChartProps {
  data: TimeSeriesData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  smooth?: boolean
  stacked?: boolean
}

export function AreaChart({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  width = '100%',
  colors,
  startDate,
  endDate,
  autoUpdate = false,
  updateInterval = 5000,
  smooth = true,
  stacked = false,
  className = '',
}: AreaChartProps) {
  const [, setUpdateTrigger] = useState(0)

  useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1)
    }, updateInterval)

    return () => clearInterval(interval)
  }, [autoUpdate, updateInterval])

  const filteredData = useMemo(() => {
    return filterDataByDateRange(data, startDate, endDate)
  }, [data, startDate, endDate])

  const chartColors = getChartColors(colors)
  const themeColors = getThemeColors()

  const categories = useMemo(() => {
    return [
      ...new Set(filteredData.map((item) => item.category).filter(Boolean)),
    ]
  }, [filteredData])

  const seriesData = useMemo(() => {
    if (categories.length === 0) {
      return [
        {
          name: 'Value',
          type: 'line',
          data: filteredData.map((item) => [
            typeof item.date === 'string'
              ? new Date(item.date).getTime()
              : item.date.getTime(),
            item.value,
          ]),
          smooth,
          areaStyle: {},
          emphasis: { focus: 'series' },
        },
      ]
    }

    return categories.map((category, index) => ({
      name: category,
      type: 'line',
      data: filteredData
        .filter((item) => item.category === category)
        .map((item) => [
          typeof item.date === 'string'
            ? new Date(item.date).getTime()
            : item.date.getTime(),
          item.value,
        ]),
      smooth,
      stack: stacked ? 'total' : undefined,
      areaStyle: {},
      emphasis: { focus: 'series' },
      color: chartColors[index % chartColors.length],
    }))
  }, [filteredData, categories, smooth, stacked, chartColors])

  const option = {
    title: title
      ? {
          text: title,
          textStyle: { color: themeColors.foreground, fontSize: 16 },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
    },
    legend:
      categories.length > 0
        ? {
            data: categories,
            textStyle: { color: themeColors.foreground },
            bottom: 0,
          }
        : undefined,
    grid: {
      left: '3%',
      right: '4%',
      bottom: categories.length > 0 ? '15%' : '10%',
      top: title ? '15%' : '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      name: xAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
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
      <ReactECharts
        option={option}
        style={{ height, width }}
        notMerge
        lazyUpdate
      />
    </div>
  )
}
