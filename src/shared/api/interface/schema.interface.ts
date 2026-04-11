export enum ESchemaApi {
  SCHEMAS_API = 'project/schemas',
}

export enum ESchemaKey {
  SCHEMAS_QUERY = 'schemas_query',
  SCHEMA_FIELDS_QUERY = 'schema_fields_query',
}

export type SchemaStatus = 'active' | 'archived'

export type ProjectFieldType =
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATETIME'
  | 'ARRAY'
  | 'JSON'
  | 'ENUM'

export type FieldKindLower =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'array'
  | 'json'
  | 'enum'

export interface IFieldMetadata {
  description?: string
  enumValues?: string[]
  numberRange?: {
    min?: number | null
    max?: number | null
  }
  itemType?: FieldKindLower
}

export interface ISchemaDto {
  id: string
  key: string
  displayName: string
  status: SchemaStatus
  createdAt: string
  fieldsCount: number
  eventsCount: number
}

export interface ISchemaListResponse {
  data: ISchemaDto[]
}

export interface ISchemaResponse {
  data: ISchemaDto
}

export interface IFieldDto {
  id: string
  key: string
  displayName: string
  type: ProjectFieldType
  required: boolean
  status: SchemaStatus
  metadata: IFieldMetadata | null
  createdAt: string
}

export interface IFieldListResponse {
  data: IFieldDto[]
}

export interface IFieldResponse {
  data: IFieldDto
}

export interface ICreateSchemaPayload {
  project_id: string
  key: string
  display_name: string
}

export interface IUpdateSchemaPayload {
  id: string
  display_name?: string
  status?: SchemaStatus
}

export interface ICreateFieldPayload {
  schema_id: string
  key: string
  display_name: string
  type: ProjectFieldType
  required: boolean
  metadata?: IFieldMetadata
}

export interface IUpdateFieldPayload {
  id: string
  display_name?: string
  required?: boolean
  metadata?: IFieldMetadata
  status?: SchemaStatus
}

export interface IBatchFieldCreate {
  key: string
  display_name: string
  type: ProjectFieldType
  required: boolean
  metadata?: IFieldMetadata
}

export interface IBatchFieldUpdate {
  id: string
  display_name?: string
  required?: boolean
  metadata?: IFieldMetadata
  status?: SchemaStatus
}

export interface IBatchFieldsPayload {
  schema_id: string
  creates: IBatchFieldCreate[]
  updates: IBatchFieldUpdate[]
  archives: string[]
}
