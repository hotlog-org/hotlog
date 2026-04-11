import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

interface CursorPayload {
  ts: string
  id: number
}

interface FieldFilter {
  schema_id?: string
  field_key: string
  value: string
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

const parseFieldFilters = (raw: string | null): FieldFilter[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry): FieldFilter[] => {
      if (!entry || typeof entry !== 'object') return []
      const obj = entry as Record<string, unknown>
      const fieldKey = typeof obj.field_key === 'string' ? obj.field_key : ''
      const value = typeof obj.value === 'string' ? obj.value : ''
      const schemaId =
        typeof obj.schema_id === 'string' ? obj.schema_id : undefined
      if (!fieldKey || !value) return []
      // Reject any field_key that doesn't match our key pattern so we
      // can safely embed it into a postgrest filter without escaping.
      if (!FIELD_KEY_PATTERN.test(fieldKey)) return []
      return [{ field_key: fieldKey, value, schema_id: schemaId }]
    })
  } catch {
    return []
  }
}

// PostgREST `or()` arguments are comma/parens-delimited; escape any of those
// characters from user input so we don't break the filter expression.
const escapeForOr = (input: string): string =>
  input.replace(/[\\(),]/g, (char) => `\\${char}`)

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
  const fieldFilters = parseFieldFilters(searchParams.get('field_filters'))

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
    // value->>'fieldKey' ILIKE '%val%'
    query = query.ilike(`value->>${f.field_key}`, `%${f.value}%`)
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
