// Shared filter types + id generator.

import type {
  EventFilterOperator,
  EventFilterQuantifier,
} from '@/shared/api/interface'

import type { SchemaFieldType } from '../../../schema/schema.interface'

export interface ParsedFieldFilter {
  id: string
  schemaId: string
  schemaKey: string
  schemaDisplayName: string
  fieldKey: string
  fieldType: SchemaFieldType
  operator: EventFilterOperator
  values: string[]
  // For json fields: dot-separated path into the nested object
  keyPath?: string
  // For array fields: how the operator is applied across elements
  quantifier?: EventFilterQuantifier
}

export const makeFilterId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `filter_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
