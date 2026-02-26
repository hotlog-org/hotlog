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
  type BaseChartData,
  type HeatmapData,
  type ScatterData,
  type TimelineData,
  type TimeSeriesData,
} from '@/shared/charts'

// Sample data generators
const generateTimeSeriesData = (days = 30): TimeSeriesData[] => {
  const data: TimeSeriesData[] = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    data.push({
      date,
      value: Math.floor(Math.random() * 100) + 50,
      category: i % 2 === 0 ? 'Series A' : 'Series B',
    })
  }
  return data
}

const generateCategoricalData = (): BaseChartData[] => [
  { name: 'Product A', value: 120 },
  { name: 'Product B', value: 200 },
  { name: 'Product C', value: 150 },
  { name: 'Product D', value: 80 },
  { name: 'Product E', value: 90 },
]

const generateScatterData = (): ScatterData[] => {
  const data: ScatterData[] = []
  for (let i = 0; i < 50; i++) {
    data.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 20 + 5,
      category: i % 3 === 0 ? 'Group A' : i % 3 === 1 ? 'Group B' : 'Group C',
    })
  }
  return data
}

const generateHeatmapData = (): HeatmapData[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const data: HeatmapData[] = []

  days.forEach((day) => {
    hours.forEach((hour) => {
      data.push({
        x: day,
        y: hour,
        value: Math.floor(Math.random() * 10),
      })
    })
  })
  return data
}

const generateTimelineData = (): TimelineData[] => {
  return [
    {
      name: 'Planning Phase',
      start: new Date('2024-01-01'),
      end: new Date('2024-01-15'),
      category: 'Planning',
    },
    {
      name: 'Design Phase',
      start: new Date('2024-01-10'),
      end: new Date('2024-02-01'),
      category: 'Design',
    },
    {
      name: 'Development Phase',
      start: new Date('2024-01-25'),
      end: new Date('2024-03-15'),
      category: 'Development',
    },
    {
      name: 'Testing Phase',
      start: new Date('2024-03-01'),
      end: new Date('2024-03-30'),
      category: 'Testing',
    },
    {
      name: 'Deployment',
      start: new Date('2024-03-25'),
      end: new Date('2024-04-05'),
      category: 'Deployment',
    },
  ]
}

export function ChartsExample() {
  const timeSeriesData = generateTimeSeriesData(30)
  const categoricalData = generateCategoricalData()
  const scatterData = generateScatterData()
  const heatmapData = generateHeatmapData()
  const timelineData = generateTimelineData()

  return (
    <div className='space-y-8 p-8'>
      <div>
        <h2 className='mb-4 text-2xl font-bold'>Area Chart</h2>
        <AreaChart
          data={timeSeriesData}
          title='Revenue Over Time'
          xAxisLabel='Date'
          yAxisLabel='Revenue ($)'
          smooth
        />
      </div>

      <div>
        <h2 className='mb-4 text-2xl font-bold'>Line Chart</h2>
        <LineChart
          data={timeSeriesData}
          title='Sales Trend'
          xAxisLabel='Date'
          yAxisLabel='Sales'
          smooth
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div>
          <h2 className='mb-4 text-2xl font-bold'>Bar Chart</h2>
          <BarChart
            data={categoricalData}
            isTimeSeries={false}
            title='Sales by Product'
            xAxisLabel='Product'
            yAxisLabel='Sales'
          />
        </div>

        <div>
          <h2 className='mb-4 text-2xl font-bold'>Stacked Bar Chart</h2>
          <StackedBarChart
            data={timeSeriesData}
            title='Product Mix'
            xAxisLabel='Date'
            yAxisLabel='Sales'
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div>
          <h2 className='mb-4 text-2xl font-bold'>Pie Chart</h2>
          <PieChart
            data={categoricalData}
            title='Market Share'
            showPercentage
          />
        </div>

        <div>
          <h2 className='mb-4 text-2xl font-bold'>Donut Chart</h2>
          <DonutChart
            data={categoricalData}
            title='Product Distribution'
            showPercentage
          />
        </div>
      </div>

      <div>
        <h2 className='mb-4 text-2xl font-bold'>Scatter Chart</h2>
        <ScatterChart
          data={scatterData}
          title='Correlation Analysis'
          xAxisLabel='Feature X'
          yAxisLabel='Feature Y'
          height={500}
        />
      </div>

      <div>
        <h2 className='mb-4 text-2xl font-bold'>Heatmap Chart</h2>
        <HeatmapChart
          data={heatmapData}
          title='Activity Heatmap'
          xAxisLabel='Day of Week'
          yAxisLabel='Hour of Day'
          height={600}
        />
      </div>

      <div>
        <h2 className='mb-4 text-2xl font-bold'>Histogram Chart</h2>
        <HistogramChart
          data={timeSeriesData}
          title='Value Distribution'
          binCount={10}
          xAxisLabel='Value Range'
          yAxisLabel='Frequency'
        />
      </div>

      <div>
        <h2 className='mb-4 text-2xl font-bold'>Timeline Chart</h2>
        <TimelineChart
          data={timelineData}
          title='Project Timeline'
          height={400}
        />
      </div>
    </div>
  )
}
