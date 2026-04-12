'use client'

import { DataTable } from '@/shared/ui/data-table'

import type { SchemaRow } from '../../schema.interface'
import type { TFunction } from '../../schema.service'
import { useSchemaTableService } from './schema-table.service'

export interface SchemaTableProps {
  rows: SchemaRow[]
  onOpen: (id: string) => void
  t: TFunction
}

export function SchemaTable(props: SchemaTableProps) {
  const service = useSchemaTableService(props)

  return (
    <DataTable
      columns={service.columns}
      data={props.rows}
      onRowClick={(row) => props.onOpen((row as SchemaRow).id)}
      paginated={false}
      t={props.t}
    />
  )
}
