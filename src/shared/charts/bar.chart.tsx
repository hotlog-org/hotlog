'use client'

import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  BaseChartData,
  BaseChartProps,
  TimeSeriesData,
} from './chart.types'
import {
  filterDataByDateRange,
  getBorderRadius,
  getChartColors,
  getThemeColors,
} from './chart.utils'

export interface BarChartProps extends BaseChartProps {
  data: TimeSeriesData[] | BaseChartData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  horizontal?: boolean
  isTimeSeries?: boolean
}

export function BarChart({
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
  horizontal = false,
  isTimeSeries = true,
  className = '',
}: BarChartProps) {
  const [, setUpdateTrigger] = useState(0)

  useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1)
    }, updateInterval)

    return () => clearInterval(interval)
  }, [autoUpdate, updateInterval])

  const filteredData = useMemo(() => {
    if (isTimeSeries) {
      return filterDataByDateRange(data as TimeSeriesData[], startDate, endDate)
    }
    return data
  }, [data, startDate, endDate, isTimeSeries])

  const chartColors = getChartColors(colors)
  const themeColors = getThemeColors()
  const borderRadius = getBorderRadius()

  const categories = useMemo(() => {
    if (isTimeSeries) {
      return [
        ...new Set(
          (filteredData as TimeSeriesData[])
            .map((item) => item.category)
            .filter(Boolean),
        ),
      ]
    }
    return []
  }, [filteredData, isTimeSeries])

  const { xAxisData, seriesData } = useMemo(() => {
    if (isTimeSeries) {
      const timeSeriesData = filteredData as TimeSeriesData[]

      if (categories.length === 0) {
        return {
          xAxisData: timeSeriesData.map((item) =>
            typeof item.date === 'string'
              ? new Date(item.date).getTime()
              : item.date.getTime(),
          ),
          seriesData: [
            {
              name: 'Value',
              type: 'bar',
              data: timeSeriesData.map((item) => item.value),
              itemStyle: {
                color: chartColors[0],
                borderRadius: [borderRadius, borderRadius, 0, 0],
              },
            },
          ],
        }
      }

      const uniqueDates = [
        ...new Set(
          timeSeriesData.map((item) =>
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
          data: uniqueDates.map((date) => {
            const item = timeSeriesData.find((d) => {
              const dTime =
                typeof d.date === 'string'
                  ? new Date(d.date).getTime()
                  : d.date.getTime()
              return dTime === date && d.category === category
            })
            return item ? item.value : 0
          }),
          itemStyle: {
            color: chartColors[index % chartColors.length],
            borderRadius: [borderRadius, borderRadius, 0, 0],
          },
        })),
      }
    } else {
      const baseData = filteredData as BaseChartData[]
      return {
        xAxisData: baseData.map((item) => item.name),
        seriesData: [
          {
            name: 'Value',
            type: 'bar',
            data: baseData.map((item) => item.value),
            itemStyle: {
              color: chartColors[0],
              borderRadius: [borderRadius, borderRadius, 0, 0],
            },
          },
        ],
      }
    }
  }, [filteredData, categories, isTimeSeries, chartColors, borderRadius])

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
      type: horizontal ? 'value' : isTimeSeries ? 'time' : 'category',
      data: horizontal ? undefined : xAxisData,
      name: xAxisLabel,
      nameTextStyle: { color: themeColors.muted },
      axisLabel: { color: themeColors.muted },
      axisLine: { lineStyle: { color: themeColors.border } },
      splitLine: { show: false },
    },
    yAxis: {
      type: horizontal ? (isTimeSeries ? 'time' : 'category') : 'value',
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
      <ReactECharts
        option={option}
        style={{ height, width }}
        notMerge
        lazyUpdate
      />
    </div>
  )
}
