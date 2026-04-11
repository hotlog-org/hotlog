import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { validateEventValue, type ValidatorField } from '@/lib/schema-validator'
import type { IApiErrorResponse } from '@/shared/api/interface'
import type { Database } from '../../../../../database.types'

interface IngestErrorResponse {
  error: {
    message: string
    field_errors?: { field_key: string; reason: string }[]
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const apiKey = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : ''

  if (!apiKey) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Missing Bearer API key' } },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Body must be a JSON object' } },
      { status: 400 },
    )
  }

  const { schema_key: schemaKey, value } = body as {
    schema_key?: unknown
    value?: unknown
  }

  if (typeof schemaKey !== 'string' || !schemaKey) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'schema_key is required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // Resolve project from API key
  const { data: keyRow, error: keyError } = await supabase
    .from('api_keys')
    .select('project_id')
    .eq('key', apiKey)
    .maybeSingle()

  if (keyError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: keyError.message } },
      { status: 500 },
    )
  }

  if (!keyRow) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Invalid API key' } },
      { status: 401 },
    )
  }

  // Resolve active schema by (project_id, key)
  const { data: schemaRow, error: schemaError } = await supabase
    .from('schemas')
    .select('id, key')
    .eq('project_id', keyRow.project_id)
    .eq('key', schemaKey)
    .eq('status', 'active')
    .maybeSingle()

  if (schemaError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: schemaError.message } },
      { status: 500 },
    )
  }

  if (!schemaRow) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: `No active schema with key "${schemaKey}" found in this project`,
        },
      },
      { status: 404 },
    )
  }

  // Load active fields for the schema
  const { data: fieldRows, error: fieldsError } = await supabase
    .from('fields')
    .select('key, type, required, metadata')
    .eq('schema_id', schemaRow.id)
    .eq('status', 'active')

  if (fieldsError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: fieldsError.message } },
      { status: 500 },
    )
  }

  const validatorFields: ValidatorField[] = (fieldRows ?? []).map((row) => ({
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

  const { data: insertedEvent, error: insertError } = await supabase
    .from('events')
    .insert({
      project_id: keyRow.project_id,
      schema_id: schemaRow.id,
      value: value as Database['public']['Tables']['events']['Insert']['value'],
    })
    .select('id, created_at')
    .single()

  if (insertError || !insertedEvent) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: { message: insertError?.message ?? 'Failed to store event' },
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      data: {
        id: insertedEvent.id,
        createdAt: insertedEvent.created_at,
      },
    },
    { status: 201 },
  )
}
