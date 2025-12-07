export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'
  | 'array'
  | 'json'
  | 'object'

export interface SchemaFieldNode {
  id: string
  name: string
  type: SchemaFieldType
  description?: string
  enumValues?: string[]
  numberRange?: {
    min?: number | null
    max?: number | null
  }
  itemType?: SchemaFieldType
  children?: SchemaFieldNode[]
}

export interface SchemaDefinition {
  id: string
  name: string
  version: string
  fields: SchemaFieldNode[]
}

export interface SchemaRow {
  id: string
  name: string
  fieldsCount: number
}
