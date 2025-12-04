'use client'

import useEventsService from './events.service'

export function EventsComponent() {
  const server = useEventsService()

  return (
    <div className='space-y-2'>
      <div>Table</div>
    </div>
  )
}
