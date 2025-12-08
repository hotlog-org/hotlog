'use client'

import { X as LucideX } from 'lucide-react'

import useEventsService from './events.service'
import { EventsTable } from './fields/table/events-table.component'
import { DetailDrawer } from './fields/detail/detail-drawer.component'

export function EventsComponent() {
  const service = useEventsService()

  return (
    <div className='flex flex-1 flex-col space-y-4'>
      <div className='flex flex-1 flex-col space-y-2'>
        <h1 className='text-2xl'>{service.t('title')}</h1>

        {(service.selectedSchemas.length > 0 ||
          service.appliedFilters.length > 0) && (
          <div className='flex flex-wrap items-center gap-2'>
            {service.selectedSchemas.map((schemaId) => {
              const schema = service.schemas.find((s) => s.id === schemaId)
              return (
                <span
                  key={`schema-${schemaId}`}
                  className='border-border text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs'
                >
                  <span className='font-medium text-foreground'>
                    {schema?.name ?? schemaId}
                  </span>
                  <button
                    type='button'
                    onClick={() => service.removeSchema(schemaId)}
                    className='hover:text-foreground'
                  >
                    <LucideX className='size-3.5' />
                  </button>
                </span>
              )
            })}

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

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <EventsTable
            rows={service.rows}
            onOpen={service.openEvent}
            t={service.t}
          />
        </div>
      </div>

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
