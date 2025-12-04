import type { EventRow } from '../../mock-data'

export interface EventsTableProps {
  rows: EventRow[]
  onOpen: (rowId: string) => void
  t: (key: string, params?: Record<string, unknown>) => string
}
