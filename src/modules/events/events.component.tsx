'use client'

import { Card, CardContent, CardTitle } from '@/shared/ui/card'
import { X as LucideX } from 'lucide-react'

import useEventsService from './events.service'
import { EventsTable } from './fields/table/events-table.component'
import { DetailDrawer } from './fields/detail/detail-drawer.component'

export function EventsComponent() {
  const service = useEventsService()

  return (
    <div className='flex flex-1 flex-col space-y-4'>
      {/* <Card className='h-full'> */}
      <div className='space-y-3'>
        <CardTitle className='ml-4 text-2xl'>{service.t('title')}</CardTitle>

        {service.appliedFilters.length > 0 && (
          <div>
            {service.appliedFilters.map((filter) => {
              const schema = service.schemas.find(
                (s) => s.id === filter.schemaId,
              )
              const field = schema?.fields.find(
                (f) => f.key === filter.fieldKey,
              )
              return (
                <span
                  key={`${filter.schemaId}-${filter.fieldKey}`}
                  className='border-border text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs'
                >
                  <span className='font-medium text-foreground'>
                    {schema?.name ?? filter.schemaId}
                  </span>
                  <span className='text-border'>/</span>
                  <span>{field?.label ?? filter.fieldKey}</span>
                  <span className='text-border'>=</span>
                  <span className='text-foreground'>{filter.value}</span>
                  <button
                    type='button'
                    onClick={() =>
                      service.removeFieldFilter(
                        filter.schemaId,
                        filter.fieldKey,
                      )
                    }
                    className='hover:text-foreground'
                  >
                    <LucideX className='size-3.5' />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        <EventsTable
          rows={service.rows}
          onOpen={service.openEvent}
          t={service.t}
        />
      </div>
      {/* </Card> */}

      <DetailDrawer
        open={service.drawerOpen}
        onClose={service.closeDrawer}
        event={service.selectedEvent}
        schema={service.selectedSchema}
        t={service.t}
      />
    </div>
  )
}
