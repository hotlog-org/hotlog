import type { ColumnDef } from '@tanstack/react-table'

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  t: (key: string, params?: Record<string, unknown>) => string
  rowCountLabel: string
  className?: string
}
