import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { validateEventValue, type ValidatorField } from '@/lib/schema-validator'
import type { IApiErrorResponse } from '@/shared/api/interface'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 64 * 1024

interface IngestErrorResponse {
  error: {
    message: string
    field_errors?: { field_key: string; reason: string }[]
  }
}

function mapPgError(err: { code?: string; message: string }) {
  if (err.message.includes('invalid_api_key')) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Invalid API key' } },
      { status: 401 },
    )
  }
  if (err.message.includes('schema_not_found')) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Schema not found or not active' } },
      { status: 404 },
    )
  }
  return NextResponse.json<IApiErrorResponse>(
    { error: { message: err.message } },
    { status: 500 },
  )
}

export async function POST(request: NextRequest) {
  const ct = request.headers.get('content-type') ?? ''
  if (!ct.toLowerCase().includes('application/json')) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Content-Type must be application/json' } },
      { status: 415 },
    )
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const apiKey = /^bearer\s+/i.test(authHeader)
    ? authHeader.replace(/^bearer\s+/i, '').trim()
    : ''

  if (!apiKey) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Missing Bearer API key' } },
      { status: 401 },
    )
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Payload too large' } },
      { status: 413 },
    )
  }

  let body: { schema_key?: unknown; value?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Body must be valid JSON' } },
      { status: 400 },
    )
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Body must be a JSON object' } },
      { status: 400 },
    )
  }

  const schemaKey = body.schema_key
  const value = body.value

  if (typeof schemaKey !== 'string' || !schemaKey) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'schema_key is required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // Load active fields via SECURITY DEFINER fn (also validates the key/schema).
  const { data: fieldRows, error: fieldsError } = await supabase.rpc(
    'get_active_fields_for_ingest',
    { p_api_key: apiKey, p_schema_key: schemaKey },
  )

  if (fieldsError) return mapPgError(fieldsError)

  const validatorFields = ((fieldRows ?? []) as Array<{
    key: string
    type: ValidatorField['type']
    required: boolean
    metadata: ValidatorField['metadata']
  }>).map((row) => ({
    key: row.key,
    type: row.type,
    required: row.required,
    metadata: (row.metadata ?? {}) as ValidatorField['metadata'],
  }))

  const errors = validateEventValue(value, validatorFields)
  if (errors.length > 0) {
    return NextResponse.json<IngestErrorResponse>(
      {
        error: {
          message: 'Event value failed schema validation',
          field_errors: errors,
        },
      },
      { status: 400 },
    )
  }

  const { data: ingested, error: ingestError } = await supabase.rpc(
    'ingest_event',
    {
      p_api_key: apiKey,
      p_schema_key: schemaKey,
      p_value: value as never,
    },
  )

  if (ingestError) return mapPgError(ingestError)

  const rows = (ingested ?? []) as Array<{
    id: number
    created_at: string
  }>
  const row = rows[0]

  if (!row) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Failed to store event' } },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      data: {
        id: row.id,
        createdAt: row.created_at,
      },
    },
    { status: 201 },
  )
}
