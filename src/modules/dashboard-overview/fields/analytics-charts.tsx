'use client'

import { LineChart } from '@/shared/charts'
import type { TimeSeriesData } from '@/shared/charts/chart.types'
import { Card } from '@/shared/ui/card'

interface AnalyticsChartsProps {
  apiRequestsData: TimeSeriesData[]
  recordsAndIdentitiesData: TimeSeriesData[]
}

export function AnalyticsCharts({
  apiRequestsData,
  recordsAndIdentitiesData,
}: AnalyticsChartsProps) {
  return (
    <div className='grid gap-6 md:grid-cols-2'>
      {/* API Requests Chart */}
      <Card className='p-6'>
        <LineChart data={apiRequestsData} title='API Requests' height={300} />
      </Card>

      {/* New Records & Identities Chart */}
      <Card className='p-6'>
        <LineChart
          data={recordsAndIdentitiesData}
          title='New Records & Identities'
          height={300}
        />
      </Card>
    </div>
  )
}
