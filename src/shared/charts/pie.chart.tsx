'use client'

import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getChartColors, getThemeColors } from './chart.utils'
import type { BaseChartProps, BaseChartData } from './chart.types'

export interface PieChartProps extends BaseChartProps {
  data: BaseChartData[]
  title?: string
  showPercentage?: boolean
  radius?: string | string[]
}

export function PieChart({
  data,
  title,
  height = 400,
  width = '100%',
  colors,
  autoUpdate = false,
  updateInterval = 5000,
  showPercentage = true,
  radius = '50%',
  className = '',
}: PieChartProps) {
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

  const option = {
    title: title
      ? {
          text: title,
          textStyle: { color: themeColors.foreground, fontSize: 16 },
          left: 'center',
        }
      : undefined,
    tooltip: {
      trigger: 'item',
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: themeColors.foreground },
    },
    series: [
      {
        name: 'Value',
        type: 'pie',
        radius,
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: chartColors[index % chartColors.length] },
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: true,
          formatter: showPercentage ? '{b}: {d}%' : '{b}: {c}',
          color: themeColors.foreground,
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
