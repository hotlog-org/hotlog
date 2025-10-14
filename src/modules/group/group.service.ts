import type {
    BaseChartData,
    HeatmapData,
    ScatterData,
    TimelineData,
    TimeSeriesData,
} from '@/shared/charts'

export const useGroupService = (groupId: string) => {
  // Mock time series data for area, line, bar, stacked bar charts
  const getTimeSeriesData = (): TimeSeriesData[] => {
    const data: TimeSeriesData[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      data.push({
        date,
        value: Math.floor(Math.random() * 150) + 50,
        category: 'Revenue',
      })

      data.push({
        date,
        value: Math.floor(Math.random() * 100) + 30,
        category: 'Expenses',
      })

      data.push({
        date,
        value: Math.floor(Math.random() * 80) + 20,
        category: 'Profit',
      })
    }
    return data
  }

  // Mock categorical data for pie and donut charts
  const getCategoricalData = (): BaseChartData[] => [
    { name: 'Direct Traffic', value: 335 },
    { name: 'Email Marketing', value: 310 },
    { name: 'Affiliate Links', value: 234 },
    { name: 'Social Media', value: 135 },
    { name: 'Search Engines', value: 548 },
    { name: 'Other', value: 98 },
  ]

  // Mock categorical data for bar chart
  const getBarChartData = (): BaseChartData[] => [
    { name: 'Monday', value: 120 },
    { name: 'Tuesday', value: 200 },
    { name: 'Wednesday', value: 150 },
    { name: 'Thursday', value: 180 },
    { name: 'Friday', value: 220 },
    { name: 'Saturday', value: 110 },
    { name: 'Sunday', value: 90 },
  ]

  // Mock scatter data
  const getScatterData = (): ScatterData[] => {
    const data: ScatterData[] = []
    const categories = ['Premium Users', 'Standard Users', 'Free Users']

    for (let i = 0; i < 80; i++) {
      data.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 30 + 10,
        category: categories[i % 3],
      })
    }
    return data
  }

  // Mock heatmap data (activity by day and hour)
  const getHeatmapData = (): HeatmapData[] => {
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

  // Mock histogram data
  const getHistogramData = (): TimeSeriesData[] => {
    const data: TimeSeriesData[] = []
    const now = new Date()

    for (let i = 0; i < 200; i++) {
      data.push({
        date: now,
        value: Math.floor(Math.random() * 100) + 1,
      })
    }
    return data
  }

  // Mock timeline data (project phases)
  const getTimelineData = (): TimelineData[] => [
    {
      name: 'Market Research',
      start: new Date('2024-01-01'),
      end: new Date('2024-01-20'),
      category: 'Research',
    },
    {
      name: 'Product Planning',
      start: new Date('2024-01-15'),
      end: new Date('2024-02-10'),
      category: 'Planning',
    },
    {
      name: 'UI/UX Design',
      start: new Date('2024-02-01'),
      end: new Date('2024-03-01'),
      category: 'Design',
    },
    {
      name: 'Frontend Development',
      start: new Date('2024-02-20'),
      end: new Date('2024-04-15'),
      category: 'Development',
    },
    {
      name: 'Backend Development',
      start: new Date('2024-03-01'),
      end: new Date('2024-04-20'),
      category: 'Development',
    },
    {
      name: 'Testing & QA',
      start: new Date('2024-04-10'),
      end: new Date('2024-05-01'),
      category: 'Testing',
    },
    {
      name: 'Beta Launch',
      start: new Date('2024-04-25'),
      end: new Date('2024-05-10'),
      category: 'Launch',
    },
    {
      name: 'Full Release',
      start: new Date('2024-05-05'),
      end: new Date('2024-05-15'),
      category: 'Launch',
    },
  ]

  return {
    groupId,
    timeSeriesData: getTimeSeriesData(),
    categoricalData: getCategoricalData(),
    barChartData: getBarChartData(),
    scatterData: getScatterData(),
    heatmapData: getHeatmapData(),
    histogramData: getHistogramData(),
    timelineData: getTimelineData(),
  }
}
