'use client'

import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import type { BaseChartProps, TimeSeriesData } from './chart.types'
import {
  filterDataByDateRange,
  getChartColors,
  getThemeColors,
} from './chart.utils'

export interface HistogramChartProps extends BaseChartProps {
  data: TimeSeriesData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  binCount?: number
}

export function HistogramChart({
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
  binCount = 10,
  className = '',
}: HistogramChartProps) {
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

  const { bins, frequencies } = useMemo(() => {
    const values = filteredData.map((item) => item.value as number)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const binWidth = (maxValue - minValue) / binCount

    const binEdges = Array.from(
      { length: binCount + 1 },
      (_, i) => minValue + i * binWidth,
    )
    const binLabels = Array.from(
      { length: binCount },
      (_, i) => `${binEdges[i].toFixed(1)} - ${binEdges[i + 1].toFixed(1)}`,
    )
    const binFrequencies = Array(binCount).fill(0)

    values.forEach((value) => {
      const binIndex = Math.min(
        Math.floor((value - minValue) / binWidth),
        binCount - 1,
      )
      binFrequencies[binIndex]++
    })

    return {
      bins: binLabels,
      frequencies: binFrequencies,
    }
  }, [filteredData, binCount])

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
      formatter: (params: Array<{ name: string; value: number }>) => {
        return `${params[0].name}<br/>Frequency: ${params[0].value}`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: title ? '15%' : '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: bins,
      name: xAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: {
        color: themeColors.muted,
        rotate: 45,
      },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel || 'Frequency',
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { lineStyle: { color: themeColors.border, type: 'dashed' } },
    },
    series: [
      {
        name: 'Frequency',
        type: 'bar',
        data: frequencies,
        itemStyle: { color: chartColors[0] },
      },
    ],
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
