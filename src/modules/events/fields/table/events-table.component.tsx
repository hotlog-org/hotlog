'use client'

import type { ReactNode } from 'react'

import { DataTable } from '@/shared/ui/data-table'
import type { EventRow } from '../../mock-data'
import type { TFunction } from '../../events.service'

import { useEventsTableService } from './events-table.service'

export interface EventsTableProps {
  rows: EventRow[]
  onOpen: (rowId: string) => void
  onDelete?: (id: number) => void
  canDelete?: boolean
  t: TFunction
  paginated?: boolean
  footer?: ReactNode
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleRow?: (id: string, selected: boolean) => void
  onToggleAllVisible?: (ids: string[], selected: boolean) => void
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
      paginated={props.paginated}
      footer={props.footer}
      selectable={props.selectable}
      getRowId={(row) => (row as (typeof props.rows)[number]).id}
      selectedIds={props.selectedIds}
      onToggleRow={props.onToggleRow}
      onToggleAllVisible={props.onToggleAllVisible}
    />
  )
}
