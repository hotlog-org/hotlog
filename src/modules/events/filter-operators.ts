import type {
  EventFilterOperator,
  EventFilterQuantifier,
  ProjectFieldType,
} from '@/shared/api/interface'

import type { SchemaFieldType } from '../schema/schema.interface'

type TranslatorFn = (key: string) => string

// Operators valid for each field type. The first entry is the default
// operator suggested when a user picks the field for the first time.
// (Array and json have extra structure on top — see the parser.)
export const OPERATORS_BY_TYPE: Record<SchemaFieldType, EventFilterOperator[]> =
  {
    string: ['eq', 'contains', 'starts_with', 'ends_with'],
    number: ['eq', 'gt', 'gte', 'lt', 'lte', 'contains'],
    boolean: ['eq'],
    datetime: ['eq', 'gt', 'gte', 'lt', 'lte'],
    enum: ['eq', 'contains'],
    array: ['eq', 'gt', 'gte', 'lt', 'lte'],
    json: ['eq', 'gt', 'gte', 'lt', 'lte'],
  }

export const DEFAULT_OPERATOR_FOR_TYPE: Record<
  SchemaFieldType,
  EventFilterOperator
> = {
  string: 'eq',
  number: 'eq',
  boolean: 'eq',
  datetime: 'eq',
  enum: 'eq',
  array: 'eq',
  json: 'eq',
}

// Canonical literal that the parser/buttons use.
export const OPERATOR_LITERALS: Record<EventFilterOperator, string> = {
  eq: '=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  contains: '?=',
  starts_with: 'start',
  ends_with: 'end',
}

// Reverse-lookup: literal -> canonical operator. Includes a few
// alternate spellings the parser should accept.
export const OPERATOR_LITERAL_LOOKUP: Record<string, EventFilterOperator> = {
  '=': 'eq',
  '==': 'eq',
  '>': 'gt',
  '>=': 'gte',
  '<': 'lt',
  '<=': 'lte',
  '?=': 'contains',
  start: 'starts_with',
  startswith: 'starts_with',
  starts_with: 'starts_with',
  end: 'ends_with',
  endswith: 'ends_with',
  ends_with: 'ends_with',
}

export const ALL_OPERATORS: EventFilterOperator[] = [
  'eq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'starts_with',
  'ends_with',
]

// Server-side allow-list keyed by the database `ProjectFieldType` (the
// uppercase enum that flows over the wire). The route uses this to
// reject illegal operator/type combinations before hitting Postgres.
export const OPERATORS_BY_DB_TYPE: Record<
  ProjectFieldType,
  EventFilterOperator[]
> = {
  STRING: OPERATORS_BY_TYPE.string,
  NUMBER: OPERATORS_BY_TYPE.number,
  BOOLEAN: OPERATORS_BY_TYPE.boolean,
  DATETIME: OPERATORS_BY_TYPE.datetime,
  ENUM: OPERATORS_BY_TYPE.enum,
  ARRAY: OPERATORS_BY_TYPE.array,
  JSON: OPERATORS_BY_TYPE.json,
}

const KNOWN_OPERATORS = new Set<EventFilterOperator>(ALL_OPERATORS)

export const isKnownOperator = (value: unknown): value is EventFilterOperator =>
  typeof value === 'string' && KNOWN_OPERATORS.has(value as EventFilterOperator)

const KNOWN_QUANTIFIERS = new Set<EventFilterQuantifier>(['has', 'any', 'all'])

export const isKnownQuantifier = (
  value: unknown,
): value is EventFilterQuantifier =>
  typeof value === 'string' &&
  KNOWN_QUANTIFIERS.has(value as EventFilterQuantifier)

const KNOWN_DB_TYPES: ProjectFieldType[] = [
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'DATETIME',
  'ARRAY',
  'JSON',
  'ENUM',
]

export const isKnownDbFieldType = (value: unknown): value is ProjectFieldType =>
  typeof value === 'string' &&
  (KNOWN_DB_TYPES as string[]).includes(value as string)

export interface FilterChipParts {
  schemaLabel: string
  fieldLabel: string
  // Combined operator string including quantifier and key path:
  //   eq -> "="
  //   has -> "has"
  //   any + gt -> "any >"
  //   keyPath="address.city" + eq -> "address.city if ="
  opLabel: string
  valueLabel: string
}

interface FilterForFormatting {
  schemaDisplayName: string
  fieldKey: string
  operator: EventFilterOperator
  quantifier?: EventFilterQuantifier
  keyPath?: string
  values: string[]
}

const opSymbol = (op: EventFilterOperator): string => OPERATOR_LITERALS[op]

export function formatFilterChip(
  filter: FilterForFormatting,
  _t: TranslatorFn,
): FilterChipParts {
  const symbol = opSymbol(filter.operator)
  const value = filter.values[0] ?? ''

  let opLabel = symbol
  if (filter.quantifier === 'has') {
    opLabel = 'has'
  } else if (filter.quantifier) {
    opLabel = `${filter.quantifier} ${symbol}`
  }

  if (filter.keyPath) {
    opLabel = `${filter.keyPath} if ${opLabel}`
  }

  return {
    schemaLabel: filter.schemaDisplayName,
    fieldLabel: filter.fieldKey,
    opLabel,
    valueLabel: value,
  }
}
