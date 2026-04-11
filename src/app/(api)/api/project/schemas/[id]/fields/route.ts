import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isValidFieldKey } from '@/lib/schema-validator'
import type { IApiErrorResponse } from '@/shared/api/interface'
import type { Database } from '../../../../../../../../database.types'

type FieldType = Database['public']['Enums']['FieldTypes']

const FIELD_TYPES: FieldType[] = [
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'DATETIME',
  'ARRAY',
  'JSON',
  'ENUM',
]

const isFieldType = (value: unknown): value is FieldType =>
  typeof value === 'string' && (FIELD_TYPES as string[]).includes(value)

interface FieldRow {
  id: string
  key: string
  display_name: string
  type: FieldType
  required: boolean
  status: 'active' | 'archived'
  metadata: unknown
  created_at: string
}

const mapField = (row: FieldRow) => ({
  id: row.id,
  key: row.key,
  displayName: row.display_name,
  type: row.type,
  required: row.required,
  status: row.status,
  metadata: row.metadata,
  createdAt: row.created_at,
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: schemaId } = await context.params
  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get('include_archived') === 'true'

  if (!schemaId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'schema id is required' } },
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

  let query = supabase
    .from('fields')
    .select(
      'id, key, display_name, type, required, status, metadata, created_at',
    )
    .eq('schema_id', schemaId)
    .order('created_at', { ascending: true })

  if (!includeArchived) {
    query = query.eq('status', 'active')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: ((data ?? []) as unknown as FieldRow[]).map(mapField),
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: schemaId } = await context.params
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

  const body = await request.json()
  const { key, display_name, type, required, metadata } = body ?? {}

  if (
    typeof key !== 'string' ||
    typeof display_name !== 'string' ||
    !display_name.trim() ||
    !isFieldType(type)
  ) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message:
            'key, display_name and type (one of: ' +
            FIELD_TYPES.join(', ') +
            ') are required',
        },
      },
      { status: 400 },
    )
  }

  if (!isValidFieldKey(key)) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message:
            'key must start with a lowercase letter and contain only lowercase letters, digits, and underscores',
        },
      },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('fields')
    .insert({
      schema_id: schemaId,
      key,
      display_name: display_name.trim(),
      name: display_name.trim(),
      type,
      required: Boolean(required),
      metadata: (metadata ??
        {}) as Database['public']['Tables']['fields']['Insert']['metadata'],
    })
    .select(
      'id, key, display_name, type, required, status, metadata, created_at',
    )
    .single()

  if (error || !data) {
    const status = error?.code === '23505' ? 409 : 500
    const message =
      error?.code === '23505'
        ? 'A field with this key already exists in this schema'
        : (error?.message ?? 'Failed to create field')
    return NextResponse.json<IApiErrorResponse>(
      { error: { message } },
      { status },
    )
  }

  return NextResponse.json(
    { data: mapField(data as unknown as FieldRow) },
    { status: 201 },
  )
}

export async function PATCH(request: NextRequest) {
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

  const body = await request.json()
  const { id, display_name, required, metadata, status } = body ?? {}

  if (!id || typeof id !== 'string') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'id is required' } },
      { status: 400 },
    )
  }

  if ('key' in (body ?? {}) || 'type' in (body ?? {})) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message:
            'key and type are immutable. To change the type, archive this field and create a new one.',
        },
      },
      { status: 400 },
    )
  }

  const updates: {
    display_name?: string
    name?: string
    required?: boolean
    metadata?: Database['public']['Tables']['fields']['Update']['metadata']
    status?: 'active' | 'archived'
  } = {}

  if (typeof display_name === 'string') {
    if (!display_name.trim()) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: 'display_name cannot be empty' } },
        { status: 400 },
      )
    }
    updates.display_name = display_name.trim()
    updates.name = display_name.trim()
  }

  if (typeof required === 'boolean') {
    updates.required = required
  }

  if (metadata !== undefined) {
    updates.metadata =
      metadata as Database['public']['Tables']['fields']['Update']['metadata']
  }

  if (status === 'active' || status === 'archived') {
    updates.status = status
    if (status === 'archived') {
      updates.required = false
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'no updatable fields provided' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('fields')
    .update(updates)
    .eq('id', id)
    .select(
      'id, key, display_name, type, required, status, metadata, created_at',
    )
    .single()

  if (error || !data) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error?.message ?? 'Failed to update field' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: mapField(data as unknown as FieldRow) })
}
