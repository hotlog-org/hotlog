import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

interface ComponentRow {
  id: string
  name: string
  description: string
  visualization: string
  schema_id: string | null
  inputs_ids: unknown
  index: number
  span: string
}

interface RoleLayoutRow {
  role_id: string
}

interface LayoutRow {
  id: number
  name: string
  description: string
  color: string
  created_at: string
  components: ComponentRow[]
  role_layouts: RoleLayoutRow[]
}

const mapComponent = (row: ComponentRow) => ({
  id: row.id,
  visualization: row.visualization,
  schemaId: row.schema_id,
  bindings: Array.isArray(row.inputs_ids) ? row.inputs_ids : [],
  title: row.name,
  description: row.description,
  index: row.index,
  span: row.span ?? 'full',
})

const mapLayout = (row: LayoutRow) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  color: row.color,
  createdAt: row.created_at,
  roleIds: (row.role_layouts ?? []).map((rl) => rl.role_id),
  components: (row.components ?? [])
    .sort((a, b) => a.index - b.index)
    .map(mapComponent),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

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

  const { data, error } = await supabase
    .from('layouts')
    .select(
      `id, name, description, color, created_at,
       components(id, name, description, visualization, schema_id, inputs_ids, index, span),
       role_layouts(role_id)` as '*',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  // Fetch current user's role IDs for this project
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role_id, roles!inner(project_id)' as '*')
    .eq('user_id', user.id)

  const currentUserRoleIds = ((userRoles ?? []) as any[])
    .filter((ur: any) => ur.roles?.project_id === projectId)
    .map((ur: any) => ur.role_id as string)

  const result = ((data ?? []) as unknown as LayoutRow[]).map(mapLayout)

  return NextResponse.json({ data: result, currentUserRoleIds })
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
  const { project_id, name, color, description } = body ?? {}

  if (!project_id || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id and name are required' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('layouts')
    .insert({
      project_id,
      name: name.trim(),
      color: color || '#3b82f6',
      description: description ?? '',
    } as any)
    .select('id, name, description, color, created_at' as '*')
    .single()

  if (error || !data) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error?.message ?? 'Failed to create layout' } },
      { status: 500 },
    )
  }

  const row = data as any

  return NextResponse.json(
    {
      data: {
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        createdAt: row.created_at,
        roleIds: [],
        components: [],
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
  const { id, name, color, description } = body ?? {}

  if (!id || typeof id !== 'number') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'id is required' } },
      { status: 400 },
    )
  }

  const updates: Record<string, string> = {}

  if (typeof name === 'string' && name.trim()) {
    updates.name = name.trim()
  }

  if (typeof color === 'string') {
    updates.color = color
  }

  if (typeof description === 'string') {
    updates.description = description
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'no updatable fields provided' } },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('layouts')
    .update(updates as any)
    .eq('id', id)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const { data, error: fetchError } = await supabase
    .from('layouts')
    .select(
      `id, name, description, color, created_at,
       components(id, name, description, visualization, schema_id, inputs_ids, index, span),
       role_layouts(role_id)` as '*',
    )
    .eq('id', id)
    .single()

  if (fetchError || !data) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: fetchError?.message ?? 'Failed to fetch layout' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: mapLayout(data as unknown as LayoutRow) })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'id is required' } },
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

  const { error } = await supabase
    .from('layouts')
    .delete()
    .eq('id', Number(id))

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: null })
}
