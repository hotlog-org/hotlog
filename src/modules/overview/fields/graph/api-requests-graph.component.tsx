'use client'

import { LineChart } from '@/shared/charts'
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

import type { ApiRequestSeriesPoint } from '../../overview.interface'
import type { TFunction } from '../../overview.service'
import { useApiRequestsGraphService } from './api-requests-graph.service'

export interface ApiRequestsGraphProps {
  data: ApiRequestSeriesPoint[]
  loading?: boolean
  t: TFunction
}

export function ApiRequestsGraph(props: ApiRequestsGraphProps) {
  const service = useApiRequestsGraphService(props)
  const isInitialLoading = props.loading && props.data.length === 0
  const isEmpty = !props.loading && props.data.length === 0
  const hasAnyValue = props.data.some((point) => point.value > 0)

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
        {isInitialLoading ? (
          <Skeleton className='h-[240px] w-full' />
        ) : isEmpty || !hasAnyValue ? (
          <div className='flex h-[240px] items-center justify-center text-sm text-muted-foreground'>
            {service.emptyState}
          </div>
        ) : (
          <LineChart
            data={props.data}
            height={240}
            smooth
            showArea
            className='h-full w-full'
          />
        )}
      </div>
    </Card>
  )
}
