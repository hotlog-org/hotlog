import type { SchemaFieldType } from '../../schema.interface'

export const typeOptions: SchemaFieldType[] = [
  'string',
  'number',
  'boolean',
  'datetime',
  'enum',
  'array',
  'json',
]

export const typeStyles: Record<SchemaFieldType, string> = {
  string: 'bg-blue-500/15 text-blue-400',
  number: 'bg-amber-500/15 text-amber-500',
  boolean: 'bg-emerald-500/15 text-emerald-500',
  datetime: 'bg-indigo-500/15 text-indigo-400',
  enum: 'bg-fuchsia-500/15 text-fuchsia-500',
  array: 'bg-cyan-500/15 text-cyan-500',
  json: 'bg-slate-500/15 text-slate-300',
}
