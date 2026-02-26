'use client'

import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import type { BaseChartProps, TimelineData } from './chart.types'
import { getChartColors, getThemeColors } from './chart.utils'

export interface TimelineChartProps extends BaseChartProps {
  data: TimelineData[]
  title?: string
  showLabels?: boolean
}

export function TimelineChart({
  data,
  title,
  height = 400,
  width = '100%',
  colors,
  startDate,
  endDate,
  autoUpdate = false,
  updateInterval = 5000,
  className = '',
}: TimelineChartProps) {
  const [, setUpdateTrigger] = useState(0)

  useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1)
    }, updateInterval)

    return () => clearInterval(interval)
  }, [autoUpdate, updateInterval])

  const filteredData = useMemo(() => {
    if (!startDate && !endDate) return data

    return data.filter((item) => {
      const itemStart =
        typeof item.start === 'string' ? new Date(item.start) : item.start
      const itemEnd =
        typeof item.end === 'string' ? new Date(item.end) : item.end

      if (startDate && itemEnd < startDate) return false
      if (endDate && itemStart > endDate) return false
      return true
    })
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
      return filteredData.map((item, index) => ({
        name: item.name,
        value: [
          0,
          typeof item.start === 'string'
            ? new Date(item.start).getTime()
            : item.start.getTime(),
          typeof item.end === 'string'
            ? new Date(item.end).getTime()
            : item.end.getTime(),
        ],
        itemStyle: { color: chartColors[index % chartColors.length] },
      }))
    }

    return filteredData.map((item) => {
      const categoryIndex = categories.indexOf(item.category!)
      return {
        name: item.name,
        value: [
          categoryIndex,
          typeof item.start === 'string'
            ? new Date(item.start).getTime()
            : item.start.getTime(),
          typeof item.end === 'string'
            ? new Date(item.end).getTime()
            : item.end.getTime(),
        ],
        itemStyle: { color: chartColors[categoryIndex % chartColors.length] },
      }
    })
  }, [filteredData, categories, chartColors])

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
        name: string
        value: [number, number, number]
      }) => {
        const start = new Date(params.value[1]).toLocaleDateString()
        const end = new Date(params.value[2]).toLocaleDateString()
        return `${params.name}<br/>Start: ${start}<br/>End: ${end}`
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
      left: '15%',
      right: '4%',
      bottom: categories.length > 0 ? '15%' : '10%',
      top: title ? '15%' : '10%',
      containLabel: false,
    },
    xAxis: {
      type: 'time',
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { lineStyle: { color: themeColors.border, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data:
        categories.length > 0
          ? categories
          : filteredData.map((_, i) => `Item ${i + 1}`),
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'custom',
        renderItem: (
          params: unknown,
          api: {
            value: (dim: number) => number
            coord: (value: [number, number]) => [number, number]
            size: (value: [number, number]) => [number, number]
            style: () => Record<string, unknown>
          },
        ) => {
          const categoryIndex = api.value(0)
          const start = api.coord([api.value(1), categoryIndex])
          const end = api.coord([api.value(2), categoryIndex])
          const height = api.size([0, 1])[1] * 0.6

          const rectShape = {
            x: start[0],
            y: start[1] - height / 2,
            width: end[0] - start[0],
            height,
          }

          return {
            type: 'rect',
            shape: rectShape,
            style: api.style(),
          }
        },
        encode: {
          x: [1, 2],
          y: 0,
        },
        data: seriesData,
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
