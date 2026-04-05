import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

interface RolePermissionRow {
  permission_id: string
  permissions: {
    id: string
    action: string
    subject: string
  }
}

function mapRolePermissions(rolePermissions: RolePermissionRow[]) {
  return rolePermissions.map((rp) => ({
    id: rp.permissions.id,
    action: rp.permissions.action,
    subject: rp.permissions.subject,
  }))
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

  const { data: roles, error } = await supabase
    .from('roles')
    .select(
      `id, name, created_at,
       role_permissions ( permission_id, permissions ( id, action, subject ) )`,
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const result = (roles ?? []).map((role) => ({
    id: role.id,
    name: role.name,
    createdAt: role.created_at,
    permissions: mapRolePermissions(
      role.role_permissions as unknown as RolePermissionRow[],
    ),
  }))

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
  const { project_id, name, permission_ids } = body

  if (!project_id || !name || typeof name !== 'string') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id and name are required' } },
      { status: 400 },
    )
  }

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .insert({ name: name.trim(), project_id })
    .select('id, name, created_at')
    .single()

  if (roleError || !role) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: roleError?.message ?? 'Failed to create role' } },
      { status: 500 },
    )
  }

  if (permission_ids && Array.isArray(permission_ids) && permission_ids.length > 0) {
    const rolePermissions = permission_ids.map((permissionId: string) => ({
      role_id: role.id,
      permission_id: permissionId,
    }))

    const { error: rpError } = await supabase
      .from('role_permissions')
      .insert(rolePermissions)

    if (rpError) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: rpError.message } },
        { status: 500 },
      )
    }
  }

  // Re-fetch with permissions to return complete data
  const { data: fullRole, error: fetchError } = await supabase
    .from('roles')
    .select(
      `id, name, created_at,
       role_permissions ( permission_id, permissions ( id, action, subject ) )`,
    )
    .eq('id', role.id)
    .single()

  if (fetchError || !fullRole) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: fetchError?.message ?? 'Failed to fetch role' } },
      { status: 500 },
    )
  }

  const result = {
    id: fullRole.id,
    name: fullRole.name,
    createdAt: fullRole.created_at,
    permissions: mapRolePermissions(
      fullRole.role_permissions as unknown as RolePermissionRow[],
    ),
  }

  return NextResponse.json({ data: result }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get('role_id')

  if (!roleId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'role_id is required' } },
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

  const { error } = await supabase.from('roles').delete().eq('id', roleId)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { id: roleId } })
}
