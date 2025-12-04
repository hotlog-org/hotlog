'use client'

import { DataTable } from './data-table'

import type { EventsTableProps } from './events-table.interface'
import { useEventsTableService } from './events-table.service'

export function EventsTable(props: EventsTableProps) {
  const service = useEventsTableService(props)

  return (
    <DataTable
      columns={service.columns}
      data={props.rows}
      onRowClick={(row) =>
        props.onOpen((row as (typeof props.rows)[number]).id)
      }
      t={props.t}
      rowCountLabel={service.rowCountLabel}
      className='h-full flex-1'
    />
  )
}
