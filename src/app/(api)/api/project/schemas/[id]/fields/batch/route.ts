import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isValidFieldKey } from '@/lib/schema-validator'
import type { IApiErrorResponse } from '@/shared/api/interface'
import type { Database } from '../../../../../../../../../database.types'

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

interface CreatePayload {
  key: string
  display_name: string
  type: FieldType
  required?: boolean
  metadata?: unknown
}

interface UpdatePayload {
  id: string
  display_name?: string
  required?: boolean
  metadata?: unknown
  status?: 'active' | 'archived'
}

interface BatchBody {
  creates?: CreatePayload[]
  updates?: UpdatePayload[]
  archives?: string[]
}

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

  const body = (await request.json()) as BatchBody
  const creates = body.creates ?? []
  const updates = body.updates ?? []
  const archives = body.archives ?? []

  for (const create of creates) {
    if (
      typeof create.key !== 'string' ||
      typeof create.display_name !== 'string' ||
      !create.display_name.trim() ||
      !isFieldType(create.type)
    ) {
      return NextResponse.json<IApiErrorResponse>(
        {
          error: {
            message:
              'each create needs key, display_name and type. Got invalid: ' +
              JSON.stringify(create),
          },
        },
        { status: 400 },
      )
    }
    if (!isValidFieldKey(create.key)) {
      return NextResponse.json<IApiErrorResponse>(
        {
          error: {
            message: `invalid key "${create.key}": must be lowercase letters, digits, underscores; starting with a letter`,
          },
        },
        { status: 400 },
      )
    }
  }

  if (creates.length > 0) {
    const insertRows = creates.map((c) => ({
      schema_id: schemaId,
      key: c.key,
      display_name: c.display_name.trim(),
      name: c.display_name.trim(),
      type: c.type,
      required: Boolean(c.required),
      metadata: (c.metadata ??
        {}) as Database['public']['Tables']['fields']['Insert']['metadata'],
    }))

    const { error } = await supabase.from('fields').insert(insertRows)
    if (error) {
      const status = error.code === '23505' ? 409 : 500
      const message =
        error.code === '23505'
          ? 'A field with one of these keys already exists in this schema'
          : error.message
      return NextResponse.json<IApiErrorResponse>(
        { error: { message } },
        { status },
      )
    }
  }

  for (const upd of updates) {
    if (!upd.id) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: 'each update needs an id' } },
        { status: 400 },
      )
    }
    const patch: {
      display_name?: string
      name?: string
      required?: boolean
      metadata?: Database['public']['Tables']['fields']['Update']['metadata']
      status?: 'active' | 'archived'
    } = {}
    if (typeof upd.display_name === 'string' && upd.display_name.trim()) {
      patch.display_name = upd.display_name.trim()
      patch.name = upd.display_name.trim()
    }
    if (typeof upd.required === 'boolean') patch.required = upd.required
    if (upd.metadata !== undefined) {
      patch.metadata =
        upd.metadata as Database['public']['Tables']['fields']['Update']['metadata']
    }
    if (upd.status === 'active' || upd.status === 'archived') {
      patch.status = upd.status
      if (upd.status === 'archived') patch.required = false
    }

    if (Object.keys(patch).length === 0) continue

    const { error } = await supabase
      .from('fields')
      .update(patch)
      .eq('id', upd.id)
      .eq('schema_id', schemaId)
    if (error) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: error.message } },
        { status: 500 },
      )
    }
  }

  if (archives.length > 0) {
    const { error } = await supabase
      .from('fields')
      .update({ status: 'archived', required: false })
      .in('id', archives)
      .eq('schema_id', schemaId)
    if (error) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: error.message } },
        { status: 500 },
      )
    }
  }

  const { data, error } = await supabase
    .from('fields')
    .select(
      'id, key, display_name, type, required, status, metadata, created_at',
    )
    .eq('schema_id', schemaId)
    .order('created_at', { ascending: true })

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
