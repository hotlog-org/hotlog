import { z } from 'zod'

export const eventFieldTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'datetime',
  'enum',
  'json',
  'array',
])

export type FieldType = z.infer<typeof eventFieldTypeSchema>

export const schemaFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: eventFieldTypeSchema,
  description: z.string().optional(),
  enumValues: z.array(z.string()).optional(),
})

export interface SchemaField {
  key: string
  label: string
  type: FieldType
  description?: string
  enumValues?: string[]
}

export const eventSchemaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  fields: z.array(schemaFieldSchema).min(1),
})

export interface EventSchema {
  id: string
  name: string
  version: string
  fields: SchemaField[]
}

export const eventSourceSchema = z.enum([
  'api',
  'web',
  'mobile',
  'worker',
  'ingestion',
])

export const eventStatusSchema = z.enum([
  'ingested',
  'warning',
  'error',
  'muted',
])

export type EventSource = z.infer<typeof eventSourceSchema>
export type EventStatus = z.infer<typeof eventStatusSchema>

export const eventPayloadSchema = z.record(z.string(), z.unknown())

export const eventRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  schemaId: z.string().min(1),
  source: eventSourceSchema,
  status: eventStatusSchema,
  createdAt: z.string().min(1),
  payload: eventPayloadSchema,
})

export interface EventRecord {
  id: string
  title: string
  schemaId: string
  source: EventSource
  status: EventStatus
  createdAt: string
  payload: Record<string, unknown>
}

export interface EventRow extends EventRecord {
  schemaName: string
  schemaVersion: string
}

export const eventListQuerySchema = z.object({
  search: z.string().trim().optional(),
  schemaIds: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => {
      if (Array.isArray(value)) {
        return value.filter((item) => item.length > 0)
      }
      if (!value) return []
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  offset: z.coerce.number().int().min(0).default(0),
})

export interface EventListQuery {
  search?: string
  schemaIds?: string[]
  limit?: number
  offset?: number
}

export interface EventListResult {
  items: EventRecord[]
  total: number
}

export const eventCreatePayloadSchema = z.object({
  title: z.string().trim().min(1),
  schemaId: z.string().trim().min(1),
  source: eventSourceSchema,
  status: eventStatusSchema.default('ingested'),
  payload: eventPayloadSchema.default({}),
})

export interface EventCreatePayload {
  title: string
  schemaId: string
  source: EventSource
  status: EventStatus
  payload: Record<string, unknown>
}

export const eventSchemaCreateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  version: z.string().trim().min(1),
  fields: z.array(schemaFieldSchema).min(1),
})

export interface EventSchemaCreatePayload {
  id?: string
  name: string
  version: string
  fields: SchemaField[]
}

export const eventSchemaUpdateSchema = z.object({
  name: z.string().trim().min(1),
  version: z.string().trim().min(1),
  fields: z.array(schemaFieldSchema).min(1),
})

export interface EventSchemaUpdatePayload {
  name: string
  version: string
  fields: SchemaField[]
}

export interface EventSchemasResult {
  items: EventSchema[]
}
