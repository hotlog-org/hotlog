import type { EventSchema } from '@/modules/events/mock-data'
import { eventSchemas } from '@/modules/events/mock-data'

import type {
  SchemaDefinition,
  SchemaFieldNode,
  SchemaFieldType,
} from './schema.interface'

const typeFromEvent = (
  type: EventSchema['fields'][number]['type'],
): SchemaFieldType => {
  if (type === 'json') return 'json'
  return type
}

const withId = (schemaId: string, key: string) =>
  `${schemaId}-${key}`.replace(/\s+/g, '-').toLowerCase()

const buildLocationChildren = (
  schemaId: string,
  key: string,
): SchemaFieldNode[] => [
  { id: withId(schemaId, `${key}-country`), name: 'country', type: 'string' },
  { id: withId(schemaId, `${key}-city`), name: 'city', type: 'string' },
  {
    id: withId(schemaId, `${key}-coordinates`),
    name: 'coordinates',
    type: 'object',
    children: [
      {
        id: withId(schemaId, `${key}-lat`),
        name: 'lat',
        type: 'number',
        numberRange: { min: -90, max: 90 },
      },
      {
        id: withId(schemaId, `${key}-lng`),
        name: 'lng',
        type: 'number',
        numberRange: { min: -180, max: 180 },
      },
    ],
  },
]

const mapField = (
  schemaId: string,
  field: EventSchema['fields'][number],
): SchemaFieldNode => {
  const type = field.key === 'location' ? 'object' : typeFromEvent(field.type)

  const base: SchemaFieldNode = {
    id: withId(schemaId, field.key),
    name: field.label,
    type,
    enumValues: field.type === 'enum' ? (field.enumValues ?? []) : undefined,
    numberRange:
      field.type === 'number' ? { min: undefined, max: undefined } : undefined,
    itemType: field.type === 'array' ? 'string' : undefined,
  }

  if (field.key === 'location') {
    base.children = buildLocationChildren(schemaId, field.key)
  }

  if (field.key === 'tags') {
    base.itemType = 'string'
  }

  if (field.key === 'items') {
    base.itemType = 'json'
  }

  return base
}

export const schemaDefinitions: SchemaDefinition[] = eventSchemas.map(
  (schema) => ({
    id: schema.id,
    name: schema.name,
    version: schema.version,
    fields: schema.fields.map((field) => mapField(schema.id, field)),
  }),
)

export const MAX_SCHEMA_DEPTH = 3
