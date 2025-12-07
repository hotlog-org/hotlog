'use client'

import { DataTable } from './data-table'
import type { EventRow } from '../../mock-data'
import type { TFunction } from '../../events.service'

import { useEventsTableService } from './events-table.service'

export interface EventsTableProps {
  rows: EventRow[]
  onOpen: (rowId: string) => void
  t: TFunction
}

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
    />
  )
}
