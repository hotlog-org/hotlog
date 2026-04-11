import type { ProjectFieldType, SchemaStatus } from '@/shared/api/interface'

export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'
  | 'array'
  | 'json'

export const FIELD_TYPE_TO_DB: Record<SchemaFieldType, ProjectFieldType> = {
  string: 'STRING',
  number: 'NUMBER',
  boolean: 'BOOLEAN',
  datetime: 'DATETIME',
  enum: 'ENUM',
  array: 'ARRAY',
  json: 'JSON',
}

export const DB_TO_FIELD_TYPE: Record<ProjectFieldType, SchemaFieldType> = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATETIME: 'datetime',
  ENUM: 'enum',
  ARRAY: 'array',
  JSON: 'json',
}

export interface SchemaFieldNode {
  id: string
  key: string
  displayName: string
  type: SchemaFieldType
  required: boolean
  status: SchemaStatus
  description?: string
  enumValues?: string[]
  numberRange?: {
    min?: number | null
    max?: number | null
  }
  itemType?: SchemaFieldType
  isNew?: boolean
  isDirty?: boolean
  keyManuallyEdited?: boolean
}

export interface SchemaDefinition {
  id: string
  key: string
  displayName: string
  status: SchemaStatus
  fields: SchemaFieldNode[]
}

export interface SchemaRow {
  id: string
  key: string
  displayName: string
  fieldsCount: number
  eventsCount: number
}
