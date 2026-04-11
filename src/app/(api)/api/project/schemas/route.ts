import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isValidFieldKey } from '@/lib/schema-validator'
import type { IApiErrorResponse } from '@/shared/api/interface'

interface SchemaWithCountsRow {
  id: string
  key: string
  display_name: string
  status: 'active' | 'archived'
  created_at: string
  fields: { count: number }[]
  events: { count: number }[]
}

const mapSchema = (row: SchemaWithCountsRow) => ({
  id: row.id,
  key: row.key,
  displayName: row.display_name,
  status: row.status,
  createdAt: row.created_at,
  fieldsCount: row.fields[0]?.count ?? 0,
  eventsCount: row.events[0]?.count ?? 0,
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const includeArchived = searchParams.get('include_archived') === 'true'

  if (!projectId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id is required' } },
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
    .from('schemas')
    .select(
      `id, key, display_name, status, created_at,
       fields(count),
       events(count)`,
    )
    .eq('project_id', projectId)
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

  const result = ((data ?? []) as unknown as SchemaWithCountsRow[]).map(
    mapSchema,
  )

  return NextResponse.json({ data: result })
}

export async function POST(request: NextRequest) {
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
  const { project_id, key, display_name } = body ?? {}

  if (
    !project_id ||
    typeof key !== 'string' ||
    typeof display_name !== 'string' ||
    !display_name.trim()
  ) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id, key and display_name are required' } },
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
    .from('schemas')
    .insert({
      project_id,
      key,
      display_name: display_name.trim(),
      name: display_name.trim(),
    })
    .select('id, key, display_name, status, created_at')
    .single()

  if (error || !data) {
    const status = error?.code === '23505' ? 409 : 500
    const message =
      error?.code === '23505'
        ? 'A schema with this key already exists in this project'
        : (error?.message ?? 'Failed to create schema')
    return NextResponse.json<IApiErrorResponse>(
      { error: { message } },
      { status },
    )
  }

  return NextResponse.json(
    {
      data: {
        id: data.id,
        key: data.key,
        displayName: data.display_name,
        status: data.status,
        createdAt: data.created_at,
        fieldsCount: 0,
        eventsCount: 0,
      },
    },
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
  const { id, display_name, status } = body ?? {}

  if (!id || typeof id !== 'string') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'id is required' } },
      { status: 400 },
    )
  }

  if ('key' in (body ?? {})) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'key is immutable and cannot be updated' } },
      { status: 400 },
    )
  }

  const updates: {
    display_name?: string
    name?: string
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

  if (status === 'active' || status === 'archived') {
    updates.status = status
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'no updatable fields provided' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('schemas')
    .update(updates)
    .eq('id', id)
    .select('id, key, display_name, status, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error?.message ?? 'Failed to update schema' } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: {
      id: data.id,
      key: data.key,
      displayName: data.display_name,
      status: data.status,
      createdAt: data.created_at,
    },
  })
}
