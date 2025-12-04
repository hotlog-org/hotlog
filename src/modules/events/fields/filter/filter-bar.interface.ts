import type { EventFilters, SchemaOption } from '../../events.service'

export interface FilterBarProps {
  schemas: SchemaOption[]
  activeSchemaId: EventFilters['schemaId']
  onSchemaChange: (schemaId: EventFilters['schemaId']) => void
  onReset: () => void
  t: (key: string, params?: Record<string, unknown>) => string
}
