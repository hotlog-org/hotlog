import type { Database } from '../../database.types'

type FieldTypeEnum = Database['public']['Enums']['FieldTypes']

export type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'array'
  | 'json'
  | 'enum'

export interface FieldMetadata {
  description?: string
  enumValues?: string[]
  numberRange?: {
    min?: number | null
    max?: number | null
  }
  itemType?: FieldKind
}

export interface ValidatorField {
  key: string
  type: FieldTypeEnum | Uppercase<FieldKind>
  required: boolean
  metadata: FieldMetadata | null
}

export interface ValidationError {
  field_key: string
  reason: string
}

const toKind = (type: ValidatorField['type']): FieldKind =>
  type.toLowerCase() as FieldKind

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

const checkPrimitive = (
  kind: FieldKind,
  value: unknown,
  metadata: FieldMetadata | null,
): string | null => {
  switch (kind) {
    case 'string':
      return typeof value === 'string' ? null : 'expected string'
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 'expected finite number'
      }
      const range = metadata?.numberRange
      if (range?.min != null && value < range.min) {
        return `must be >= ${range.min}`
      }
      if (range?.max != null && value > range.max) {
        return `must be <= ${range.max}`
      }
      return null
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : 'expected boolean'
    case 'datetime': {
      if (typeof value !== 'string' || !ISO_DATE.test(value)) {
        return 'expected ISO 8601 datetime string'
      }
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? 'expected ISO 8601 datetime string' : null
    }
    case 'enum': {
      const values = metadata?.enumValues ?? []
      if (typeof value !== 'string') return 'expected string enum value'
      if (!values.includes(value)) {
        return `must be one of: ${values.join(', ') || '<no values defined>'}`
      }
      return null
    }
    case 'json':
      return isPlainObject(value) ? null : 'expected object'
    case 'array':
      return Array.isArray(value) ? null : 'expected array'
  }
}

export function validateEventValue(
  value: unknown,
  fields: ValidatorField[],
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!isPlainObject(value)) {
    return [{ field_key: '<root>', reason: 'event value must be an object' }]
  }

  for (const field of fields) {
    const present = Object.prototype.hasOwnProperty.call(value, field.key)
    const raw = value[field.key]

    if (!present || raw === null || raw === undefined) {
      if (field.required) {
        errors.push({
          field_key: field.key,
          reason: 'required field missing',
        })
      }
      continue
    }

    const kind = toKind(field.type)
    const primitiveError = checkPrimitive(kind, raw, field.metadata)
    if (primitiveError) {
      errors.push({ field_key: field.key, reason: primitiveError })
      continue
    }

    if (kind === 'array' && Array.isArray(raw)) {
      const itemKind = field.metadata?.itemType ?? 'string'
      raw.forEach((item, idx) => {
        const itemError = checkPrimitive(itemKind, item, field.metadata)
        if (itemError) {
          errors.push({
            field_key: `${field.key}[${idx}]`,
            reason: itemError,
          })
        }
      })
    }
  }

  return errors
}

export const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/

export function isValidFieldKey(key: string): boolean {
  return FIELD_KEY_PATTERN.test(key)
}

export function slugifyKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, '_$1')
}
