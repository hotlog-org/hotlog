import type { FieldFilter, SchemaOption, TFunction } from './events.service'

export interface EventsExtraComponentProps {
  t: TFunction
  query: string
  onQueryChange: (value: string) => void
  filterMenu: {
    open: boolean
    step: 'schema' | 'field' | 'value'
    draftSchemaId: string | null
    draftFieldKey: string | null
    draftValue: string
    schemas: SchemaOption[]
    schemaHasFilters: (schemaId: string) => boolean
    fields: { field: SchemaOption['fields'][number]; hasFilter: boolean }[]
    openChange: (open: boolean) => void
    selectSchema: (schemaId: string) => void
    selectField: (fieldKey: string) => void
    setDraftValue: (value: string) => void
    back: () => void
    apply: () => void
    clearAll: () => void
  }
  appliedFilters: FieldFilter[]
  removeFieldFilter: (schemaId: string, fieldKey: string) => void
}
