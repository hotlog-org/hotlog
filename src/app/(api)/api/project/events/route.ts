import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type {
  EventFilterOperator,
  EventFilterQuantifier,
  IApiErrorResponse,
  ProjectFieldType,
} from '@/shared/api/interface'
import {
  OPERATORS_BY_DB_TYPE,
  isKnownDbFieldType,
  isKnownOperator,
  isKnownQuantifier,
} from '@/modules/events/filter-operators'

interface CursorPayload {
  ts: string
  id: number
}

interface FieldFilter {
  schema_id?: string
  field_key: string
  field_type: ProjectFieldType
  operator: EventFilterOperator
  values: string[]
  quantifier?: EventFilterQuantifier
  key_path?: string
}

interface EventRow {
  id: number
  created_at: string
  schema_id: string
  value: unknown
  schemas: {
    id: string
    key: string
    display_name: string
  } | null
}

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/
const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

const decodeCursor = (raw: string | null): CursorPayload | null => {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as CursorPayload
    if (typeof parsed.ts !== 'string' || typeof parsed.id !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const encodeCursor = (payload: CursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')

interface ParsedFieldFilters {
  filters: FieldFilter[]
  error: string | null
}

// `key_path` is a dot-separated chain of identifiers, e.g.
// `address.coordinates.lat`. Each segment must match the field-key
// pattern so we can safely embed it into the column expression.
const KEY_PATH_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/

const parseFieldFilters = (raw: string | null): ParsedFieldFilters => {
  if (!raw) return { filters: [], error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { filters: [], error: 'field_filters must be valid JSON' }
  }
  if (!Array.isArray(parsed)) {
    return { filters: [], error: 'field_filters must be an array' }
  }

  const filters: FieldFilter[] = []
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      return { filters: [], error: 'each filter must be an object' }
    }
    const obj = entry as Record<string, unknown>

    const fieldKey = typeof obj.field_key === 'string' ? obj.field_key : ''
    if (!fieldKey || !FIELD_KEY_PATTERN.test(fieldKey)) {
      return {
        filters: [],
        error: `invalid field_key "${fieldKey}": must match ^[a-z][a-z0-9_]*$`,
      }
    }

    if (!isKnownDbFieldType(obj.field_type)) {
      return {
        filters: [],
        error: `unknown field_type "${String(obj.field_type)}" on field "${fieldKey}"`,
      }
    }
    const fieldType = obj.field_type

    if (!isKnownOperator(obj.operator)) {
      return {
        filters: [],
        error: `unknown operator "${String(obj.operator)}" on field "${fieldKey}"`,
      }
    }
    const operator = obj.operator

    const allowed = OPERATORS_BY_DB_TYPE[fieldType]
    if (!allowed.includes(operator)) {
      return {
        filters: [],
        error: `operator "${operator}" is not valid for ${fieldType.toLowerCase()} field "${fieldKey}"`,
      }
    }

    const values = Array.isArray(obj.values)
      ? obj.values.filter((v): v is string => typeof v === 'string')
      : []
    if (values.length !== 1) {
      return {
        filters: [],
        error: `operator "${operator}" expects exactly 1 value, got ${values.length}`,
      }
    }

    let quantifier: EventFilterQuantifier | undefined
    if (obj.quantifier !== undefined && obj.quantifier !== null) {
      if (!isKnownQuantifier(obj.quantifier)) {
        return {
          filters: [],
          error: `unknown quantifier "${String(obj.quantifier)}" on field "${fieldKey}"`,
        }
      }
      if (fieldType !== 'ARRAY') {
        return {
          filters: [],
          error: `quantifier is only valid on array fields (got ${fieldType.toLowerCase()})`,
        }
      }
      quantifier = obj.quantifier
    }

    let keyPath: string | undefined
    if (
      obj.key_path !== undefined &&
      obj.key_path !== null &&
      obj.key_path !== ''
    ) {
      if (
        typeof obj.key_path !== 'string' ||
        !KEY_PATH_PATTERN.test(obj.key_path)
      ) {
        return {
          filters: [],
          error: `invalid key_path "${String(obj.key_path)}": must be dot-separated identifiers`,
        }
      }
      if (fieldType !== 'JSON') {
        return {
          filters: [],
          error: `key_path is only valid on json fields (got ${fieldType.toLowerCase()})`,
        }
      }
      keyPath = obj.key_path
    }

    const schemaId =
      typeof obj.schema_id === 'string' ? obj.schema_id : undefined

    filters.push({
      field_key: fieldKey,
      field_type: fieldType,
      operator,
      values,
      quantifier,
      key_path: keyPath,
      schema_id: schemaId,
    })
  }

  return { filters, error: null }
}

// PostgREST `or()` arguments are comma/parens-delimited; escape any of those
// characters from user input so we don't break the filter expression.
const escapeForOr = (input: string): string =>
  input.replace(/[\\(),]/g, (char) => `\\${char}`)

// Detect a numeric value so we can pick a numeric cast even when the
// declared field type is text-y (e.g. json with `KEY if > 30`).
const looksNumeric = (s: string): boolean => /^-?\d+(\.\d+)?$/.test(s)

// Build the text column expression for `eq` / `contains` / etc — these
// always go through the text path (`->>`) so the comparison works for
// every storage shape, including jsonb numbers stored as JSON numbers.
const textColumnFor = (f: FieldFilter): string => {
  if (f.key_path) {
    const parts = f.key_path.split('.')
    const intermediate = parts
      .slice(0, -1)
      .map((p) => `->${p}`)
      .join('')
    const last = parts[parts.length - 1]
    return `value->${f.field_key}${intermediate}->>${last}`
  }
  return `value->>${f.field_key}`
}

// Build the typed column expression for ordering operators. Uses
// `value->>key::cast` so the inner value is first extracted as text,
// then cast — this works regardless of how the value is stored in the
// underlying jsonb.
const typedColumnFor = (f: FieldFilter): string => {
  const text = textColumnFor(f)

  // For json key paths we infer the cast from the value shape because
  // we don't know the nested key's type at the field-definition level.
  if (f.key_path) {
    if (looksNumeric(f.values[0] ?? '')) return `${text}::numeric`
    return text
  }

  switch (f.field_type) {
    case 'NUMBER':
      return `${text}::numeric`
    case 'DATETIME':
      return `${text}::timestamptz`
    case 'BOOLEAN':
      return `${text}::boolean`
    default:
      return text
  }
}

// PostgrestFilterBuilder is the right return type but importing it cleanly
// is finicky and the helper is internal to this route — `unknown` plus a
// local type alias keeps the surface area minimal without losing safety
// at the call site.
type AnyFilterBuilder = ReturnType<
  ReturnType<Awaited<ReturnType<typeof createClient>>['from']>['select']
>

// Map our operator id to the JSON Path comparison op used inside a
// jsonpath filter expression. Only the simple ordering ops are valid
// inside `any` / `all` quantifiers — `contains` / `starts_with` /
// `ends_with` aren't supported in jsonpath, so the parser doesn't let
// users build that combination in the first place.
const JSONPATH_OP: Partial<Record<EventFilterOperator, string>> = {
  eq: '==',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
}

// JSON Path string literals are wrapped in double quotes; escape internal
// quotes/backslashes to keep the expression syntactically valid.
const escapeJsonPathString = (s: string): string =>
  `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

// JSON Path numeric literal — pass through if it parses as a number,
// otherwise quote as a string.
const jsonPathLiteral = (s: string): string =>
  looksNumeric(s) ? s : escapeJsonPathString(s)

const applyFieldFilter = (
  query: AnyFilterBuilder,
  f: FieldFilter,
): AnyFilterBuilder => {
  const v0 = f.values[0] ?? ''

  // ===== Array quantifiers =====
  // `has X`, `any OP X`, `all OP X` use jsonpath expressions on the
  // jsonb value. PostgREST exposes the `@?` operator which returns
  // true if the jsonpath query yields any rows.
  if (f.quantifier && f.field_type === 'ARRAY') {
    if (f.quantifier === 'has') {
      // Membership test: any element equals v0
      const literal = jsonPathLiteral(v0)
      const path = `$.${f.field_key}[*] ? (@ == ${literal})`
      return query.filter('value', '@?', path)
    }

    if (f.quantifier === 'any') {
      const op = JSONPATH_OP[f.operator]
      if (!op) return query // unsupported op for jsonpath; skip
      const literal = jsonPathLiteral(v0)
      const path = `$.${f.field_key}[*] ? (@ ${op} ${literal})`
      return query.filter('value', '@?', path)
    }

    if (f.quantifier === 'all') {
      // Universal quantifier: NOT (any element fails the predicate).
      // The negated predicate uses the inverse op.
      const inverse: Partial<Record<EventFilterOperator, string>> = {
        eq: '!=',
        gt: '<=',
        gte: '<',
        lt: '>=',
        lte: '>',
      }
      const op = inverse[f.operator]
      if (!op) return query
      const literal = jsonPathLiteral(v0)
      const path = `$.${f.field_key}[*] ? (@ ${op} ${literal})`
      return query.not('value', '@?', path)
    }
  }

  // ===== Standard comparison (with optional json key path) =====
  // For `eq`, always use the text path so the comparison works
  // regardless of how the value is stored in jsonb. For ordering
  // operators, use the typed cast so PostgreSQL does numeric /
  // temporal comparisons instead of lexicographic text ones.
  const text = textColumnFor(f)
  const typed = typedColumnFor(f)

  switch (f.operator) {
    case 'eq':
      return query.eq(text, v0)
    case 'gt':
      return query.gt(typed, v0)
    case 'gte':
      return query.gte(typed, v0)
    case 'lt':
      return query.lt(typed, v0)
    case 'lte':
      return query.lte(typed, v0)
    case 'contains':
      return query.ilike(text, `%${v0}%`)
    case 'starts_with':
      return query.ilike(text, `${v0}%`)
    case 'ends_with':
      return query.ilike(text, `%${v0}`)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id is required' } },
      { status: 400 },
    )
  }

  const limitParam = Number(searchParams.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(1, Math.trunc(limitParam)), MAX_LIMIT)
    : DEFAULT_LIMIT

  const cursor = decodeCursor(searchParams.get('cursor'))
  const schemasRaw = searchParams.get('schemas') ?? ''
  const schemas = schemasRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const search = (searchParams.get('q') ?? '').trim()
  const parsedFieldFilters = parseFieldFilters(
    searchParams.get('field_filters'),
  )

  if (parsedFieldFilters.error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: parsedFieldFilters.error } },
      { status: 400 },
    )
  }
  const fieldFilters = parsedFieldFilters.filters

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Unauthorized' } },
      { status: 401 },
    )
  }

  let query = supabase
    .from('events')
    .select(
      `id, created_at, schema_id, value,
       schemas!inner ( id, key, display_name )`,
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    // (created_at, id) < (cursor.ts, cursor.id) — keyset pagination
    query = query.or(
      `created_at.lt.${cursor.ts},and(created_at.eq.${cursor.ts},id.lt.${cursor.id})`,
    )
  }

  if (schemas.length > 0) {
    query = query.in('schema_id', schemas)
  }

  for (const f of fieldFilters) {
    query = applyFieldFilter(query, f)
    if (f.schema_id) {
      query = query.eq('schema_id', f.schema_id)
    }
  }

  if (search) {
    const escaped = escapeForOr(search)
    // Search across the whole jsonb-as-text plus the joined schema's display_name.
    // The `schemas.display_name.ilike` part references the embedded relation by alias.
    query = query.or(
      `value::text.ilike.%${escaped}%,schemas.display_name.ilike.%${escaped}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const rows = (data ?? []) as unknown as EventRow[]
  const hasMore = rows.length > limit
  const trimmed = hasMore ? rows.slice(0, limit) : rows

  const result = trimmed.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    schemaId: row.schema_id,
    schemaKey: row.schemas?.key ?? '',
    schemaDisplayName: row.schemas?.display_name ?? '',
    value: (row.value ?? {}) as Record<string, unknown>,
  }))

  const last = trimmed[trimmed.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor({ ts: last.created_at, id: last.id }) : null

  return NextResponse.json({ data: result, nextCursor })
}

const MAX_DELETE_BATCH = 500

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const idsRaw = searchParams.get('ids') ?? ''

  if (!projectId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id is required' } },
      { status: 400 },
    )
  }

  const ids = idsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && Number.isInteger(n))

  if (ids.length === 0) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'ids is required' } },
      { status: 400 },
    )
  }

  if (ids.length > MAX_DELETE_BATCH) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: `Cannot delete more than ${MAX_DELETE_BATCH} events at once`,
        },
      },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Unauthorized' } },
      { status: 401 },
    )
  }

  // Project_id is included in the WHERE clause so we never delete a row
  // that doesn't belong to the requesting project, even if a caller
  // somehow learned an event id from another project.
  //
  // The trailing `.select('id')` is load-bearing: PostgREST's DELETE
  // returns the rows that were actually deleted (i.e. rows that survived
  // RLS), not the rows that matched the WHERE clause. Without it the
  // route can't tell an RLS-blocked delete (silent 200, count=0) from a
  // delete that matched zero ids in the first place.
  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('project_id', projectId)
    .in('id', ids)
    .select('id')

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const deleted = (data ?? []).length

  if (deleted === 0) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message:
            'No events were deleted. You may be missing the delete:events permission for this project, or the events no longer exist.',
        },
      },
      { status: 403 },
    )
  }

  if (deleted < ids.length) {
    return NextResponse.json(
      {
        data: {
          deleted,
          requested: ids.length,
          message: `Only ${deleted} of ${ids.length} events were deleted. The rest may have been blocked by row-level security or already removed.`,
        },
      },
      { status: 207 },
    )
  }

  return NextResponse.json({ data: { deleted } })
}
