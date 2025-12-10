'use client'

import { LineChart } from '@/shared/charts'
import { Card } from '@/shared/ui/card'

import type { ApiRequestSeriesPoint } from '../../overview.interface'
import type { TFunction } from '../../overview.service'
import { useApiRequestsGraphService } from './api-requests-graph.service'

export interface ApiRequestsGraphProps {
  data: ApiRequestSeriesPoint[]
  t: TFunction
}

export function ApiRequestsGraph(props: ApiRequestsGraphProps) {
  const service = useApiRequestsGraphService(props)

  return (
    <Card className='p-4 md:p-6'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-semibold text-foreground'>
            {service.title}
          </h2>
          <p className='text-sm text-muted-foreground'>{service.subtitle}</p>
        </div>
      </div>

      <div className='mt-4 h-[280px]'>
        <LineChart
          data={props.data}
          height={240}
          smooth
          showArea
          className='h-full w-full'
        />
      </div>
    </Card>
  )
}
