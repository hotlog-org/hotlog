import type {
  EventRecord,
  EventSchema,
  FieldType,
  SchemaField,
} from '../../mock-data'
import type { TFunction } from '../../events.service'

export interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  event: EventRecord | null
  schema: EventSchema | null
  t: TFunction
}

export interface FieldRowConfig {
  field: SchemaField
  value: unknown
}

export type FieldRenderer = (value: unknown, t: TFunction) => JSX.Element

export type RenderersMap = Record<FieldType, FieldRenderer>
