'use client'

import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import type { BaseChartProps, HeatmapData } from './chart.types'
import { getChartColors, getThemeColors } from './chart.utils'

export interface HeatmapChartProps extends BaseChartProps {
  data: HeatmapData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  colorRange?: [string, string]
}

export function HeatmapChart({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  width = '100%',
  colors,
  autoUpdate = false,
  updateInterval = 5000,
  colorRange,
  className = '',
}: HeatmapChartProps) {
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

  const { xAxisData, yAxisData, seriesData, min, max } = useMemo(() => {
    const xValues = [...new Set(data.map((item) => item.x))].sort()
    const yValues = [...new Set(data.map((item) => item.y))].sort()

    const values = data.map((item) => item.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)

    const formattedData = data.map((item) => [
      xValues.indexOf(item.x),
      yValues.indexOf(item.y),
      item.value,
    ])

    return {
      xAxisData: xValues,
      yAxisData: yValues,
      seriesData: formattedData,
      min: minValue,
      max: maxValue,
    }
  }, [data])

  const option = {
    title: title
      ? {
          text: title,
          textStyle: { color: themeColors.foreground, fontSize: 16 },
        }
      : undefined,
    tooltip: {
      position: 'top',
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
      formatter: (params: { value: [number, number, number] }) => {
        return `${xAxisLabel || 'X'}: ${xAxisData[params.value[0]]}<br/>${yAxisLabel || 'Y'}: ${yAxisData[params.value[1]]}<br/>Value: ${params.value[2]}`
      },
    },
    grid: {
      left: '3%',
      right: '12%',
      bottom: '10%',
      top: title ? '15%' : '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: xAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: yAxisData,
      name: yAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitArea: { show: true },
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'vertical',
      right: '0',
      top: 'center',
      inRange: {
        color: colorRange || [chartColors[0], chartColors[2]],
      },
      textStyle: { color: themeColors.foreground },
    },
    series: [
      {
        name: 'Heatmap',
        type: 'heatmap',
        data: seriesData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
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
