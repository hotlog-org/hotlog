'use client'

import { Filter, RefreshCcw } from 'lucide-react'

import { Button } from '@/shared/ui/button'

import { useFilterBarService } from './filter-bar.service'
import type { EventFilters, SchemaOption } from '../../events.service'

export interface FilterBarProps {
  schemas: SchemaOption[]
  activeSchemaId: EventFilters['schemaId']
  onSchemaChange: (schemaId: EventFilters['schemaId']) => void
  onReset: () => void
  t: (key: string, params?: Record<string, unknown>) => string
}

export function EventsFilterBar(props: FilterBarProps) {
  const service = useFilterBarService(props)

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button variant='outline' className='gap-2'>
        <Filter className='size-4' />
        {service.activeSchemaLabel}
      </Button>

      <Button variant='ghost' className='gap-2' onClick={service.onReset}>
        <RefreshCcw className='size-4' />
        {service.t('filter.reset')}
      </Button>
    </div>
  )
}
