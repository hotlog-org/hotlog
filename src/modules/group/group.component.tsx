'use client'

import {
    AreaChart,
    BarChart,
    DonutChart,
    HeatmapChart,
    HistogramChart,
    LineChart,
    PieChart,
    ScatterChart,
    StackedBarChart,
    TimelineChart,
} from '@/shared/charts'
import type { DateRange } from '@/shared/charts/chart.types'
import CalendarRangeSingleMonth from '@/shared/ui/calendar2'
import { useState } from 'react'
import { useGroupService } from './group.service'

interface GroupComponentProps {
  groupId: string
}

export function GroupComponent({ groupId }: GroupComponentProps) {
  const service = useGroupService(groupId)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Group Analytics Dashboard
          </h1>
          <p className='text-muted-foreground'>
            Viewing data for group: <span className='font-mono'>{groupId}</span>
          </p>
        </div>
        {/* Centralized Date Range Picker */}
        <div className='flex items-center'>
          <CalendarRangeSingleMonth value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className='rounded-lg border border-card bg-card p-6'>
        <h2 className='mb-4 text-xl font-semibold'>Financial Overview</h2>
        <AreaChart
          data={service.timeSeriesData}
          title='Revenue, Expenses & Profit'
          xAxisLabel='Date'
          yAxisLabel='Amount ($)'
          startDate={dateRange?.from}
          endDate={dateRange?.to}
          smooth
          height={400}
        />
      </div>

      <div className='rounded-lg border border-card bg-card p-6'>
        <h2 className='mb-4 text-xl font-semibold'>Trend Analysis</h2>
        <LineChart
          data={service.timeSeriesData}
          title='Performance Metrics Over Time'
          xAxisLabel='Date'
          yAxisLabel='Value'
          startDate={dateRange?.from}
          endDate={dateRange?.to}
          smooth
          height={400}
        />
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <div className='rounded-lg border border-card bg-card p-6'>
          <h2 className='mb-4 text-xl font-semibold'>Weekly Activity</h2>
          <BarChart
            data={service.barChartData}
            isTimeSeries={false}
            title='Activity by Day'
            xAxisLabel='Day of Week'
            yAxisLabel='Activities'
            height={350}
          />
        </div>

        <div className='rounded-lg border border-card bg-card p-6'>
          <h2 className='mb-4 text-xl font-semibold'>Stacked Metrics</h2>
          <StackedBarChart
            data={service.timeSeriesData}
            title='Combined Metrics'
            xAxisLabel='Date'
            yAxisLabel='Total Value'
            height={350}
          />
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <div className='rounded-lg border border-card bg-card p-6'>
          <h2 className='mb-4 text-xl font-semibold'>Traffic Sources</h2>
          <PieChart
            data={service.categoricalData}
            title='Traffic Distribution'
            showPercentage
            height={400}
          />
        </div>

        <div className='rounded-lg border border-card bg-card p-6'>
          <h2 className='mb-4 text-xl font-semibold'>Market Share</h2>
          <DonutChart
            data={service.categoricalData}
            title='Distribution Overview'
            showPercentage
            innerRadius='50%'
            outerRadius='75%'
            height={400}
          />
        </div>
      </div>

      <div className='rounded-lg border border-card bg-card p-6'>
        <h2 className='mb-4 text-xl font-semibold'>User Engagement Analysis</h2>
        <ScatterChart
          data={service.scatterData}
          title='Engagement vs Activity Score'
          xAxisLabel='Engagement Score'
          yAxisLabel='Activity Level'
          height={500}
        />
      </div>

      <div className='rounded-lg border border-card bg-card p-6'>
        <h2 className='mb-4 text-xl font-semibold'>Activity Heatmap</h2>
        <HeatmapChart
          data={service.heatmapData}
          title='User Activity by Day and Hour'
          xAxisLabel='Day of Week'
          yAxisLabel='Hour of Day'
          height={600}
        />
      </div>

      <div className='rounded-lg border border-card bg-card p-6'>
        <h2 className='mb-4 text-xl font-semibold'>Value Distribution</h2>
        <HistogramChart
          data={service.histogramData}
          title='Response Time Distribution'
          binCount={15}
          xAxisLabel='Response Time (ms)'
          yAxisLabel='Frequency'
          height={400}
        />
      </div>

      <div className='rounded-lg border border-card bg-card p-6'>
        <h2 className='mb-4 text-xl font-semibold'>Project Timeline</h2>
        <TimelineChart
          data={service.timelineData}
          title='Development Roadmap'
          height={500}
          startDate={dateRange?.from}
          endDate={dateRange?.to}
        />
      </div>
    </div>
  )
}
