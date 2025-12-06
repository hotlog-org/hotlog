'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import useEventsService from './events.service'
import { EventsTable } from './fields/table/events-table.component'
import { DetailDrawer } from './fields/detail/detail-drawer.component'

export function EventsComponent() {
  const service = useEventsService()

  return (
    <div className='flex min-h-screen flex-1 flex-col space-y-4'>
      <Card className='flex flex-1 flex-col'>
        <CardHeader>
          <CardTitle className='text-2xl'>{service.t('title')}</CardTitle>
        </CardHeader>
        <CardContent className='min-h-full flex flex-1 flex-col'>
          <EventsTable
            rows={service.rows}
            onOpen={service.openEvent}
            t={service.t}
          />
        </CardContent>
      </Card>

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
