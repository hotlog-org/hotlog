import type { SchemaFieldType } from '../../../schema.interface'
import type { SchemaFieldRendererProps } from '../../types/schema-field-renderer.interface'
import { SchemaFieldEnum } from '../../types/schema-field-enum.component'
import { SchemaFieldNumber } from '../../types/schema-field-number.component'
import { SchemaFieldArray } from '../../types/schema-field-array.component'
import { SchemaFieldObject } from '../../types/schema-field-object.component'
import { SchemaFieldString } from '../../types/schema-field-string.component'
import { SchemaFieldBoolean } from '../../types/schema-field-boolean.component'
import { SchemaFieldDatetime } from '../../types/schema-field-datetime.component'
import { SchemaFieldJson } from '../../types/schema-field-json.component'

export const typeOptions: SchemaFieldType[] = [
  'string',
  'number',
  'boolean',
  'datetime',
  'enum',
  'array',
  'json',
  'object',
]

export const typeStyles: Record<SchemaFieldType, string> = {
  string: 'bg-blue-500/15 text-blue-400',
  number: 'bg-amber-500/15 text-amber-500',
  boolean: 'bg-emerald-500/15 text-emerald-500',
  datetime: 'bg-indigo-500/15 text-indigo-400',
  enum: 'bg-fuchsia-500/15 text-fuchsia-500',
  array: 'bg-cyan-500/15 text-cyan-500',
  json: 'bg-slate-500/15 text-slate-300',
  object: 'bg-orange-500/15 text-orange-500',
}

export const rendererMap: Partial<
  Record<SchemaFieldType, React.FC<SchemaFieldRendererProps>>
> = {
  string: SchemaFieldString,
  boolean: SchemaFieldBoolean,
  datetime: SchemaFieldDatetime,
  json: SchemaFieldJson,
  enum: SchemaFieldEnum,
  number: SchemaFieldNumber,
  array: SchemaFieldArray,
  object: SchemaFieldObject,
}
