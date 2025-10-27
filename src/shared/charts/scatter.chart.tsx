'use client'

import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import type { BaseChartProps, ScatterData } from './chart.types'
import { getChartColors, getThemeColors } from './chart.utils'

export interface ScatterChartProps extends BaseChartProps {
  data: ScatterData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
}

export function ScatterChart({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  width = '100%',
  colors,
  autoUpdate = false,
  updateInterval = 5000,
  className = '',
}: ScatterChartProps) {
  const [, setUpdateTrigger] = useState(0)

  useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1)
    }, updateInterval)

    return () => clearInterval(interval)
  }, [autoUpdate, updateInterval])

  const chartColors = getChartColors(colors)
  const themeColors = getThemeColors()

  const categories = useMemo(() => {
    return [...new Set(data.map((item) => item.category).filter(Boolean))]
  }, [data])

  const seriesData = useMemo(() => {
    if (categories.length === 0) {
      return [
        {
          name: 'Data',
          type: 'scatter',
          data: data.map((item) => [item.x, item.y, item.size || 10]),
          symbolSize: (dataItem: number[]) => dataItem[2] || 10,
          emphasis: { focus: 'series' },
          itemStyle: { color: chartColors[0] },
        },
      ]
    }

    return categories.map((category, index) => ({
      name: category,
      type: 'scatter',
      data: data
        .filter((item) => item.category === category)
        .map((item) => [item.x, item.y, item.size || 10]),
      symbolSize: (dataItem: number[]) => dataItem[2] || 10,
      emphasis: { focus: 'series' },
      itemStyle: { color: chartColors[index % chartColors.length] },
    }))
  }, [data, categories, chartColors])

  const option = {
    title: title
      ? {
          text: title,
          textStyle: { color: themeColors.foreground, fontSize: 16 },
        }
      : undefined,
    tooltip: {
      trigger: 'item',
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
      formatter: (params: {
        seriesName: string
        value: [number, number, number]
      }) => {
        return `${params.seriesName}<br/>${xAxisLabel || 'X'}: ${params.value[0]}<br/>${yAxisLabel || 'Y'}: ${params.value[1]}`
      },
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
      type: 'value',
      name: xAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { lineStyle: { color: themeColors.border, type: 'dashed' } },
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
