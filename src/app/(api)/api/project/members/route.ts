import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

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

  // Get memberships + project creator in one query
  const { data: memberships, error } = await supabase
    .from('user_projects')
    .select('user_id, projects!inner ( creator_id )')
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const userIds = (memberships ?? []).map((m) => m.user_id)

  if (!userIds.length) {
    return NextResponse.json({ data: [] })
  }

  // Get roles for these users in this project
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, roles!inner ( id, name )')
    .in('user_id', userIds)
    .eq('roles.project_id', projectId)

  if (rolesError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: rolesError.message } },
      { status: 500 },
    )
  }

  const rolesByUser = (userRoles ?? []).reduce<
    Record<string, { roleId: string; roleName: string }>
  >((acc, ur) => {
    const roles = ur.roles as unknown as { id: string; name: string }
    acc[ur.user_id] = { roleId: roles.id, roleName: roles.name }
    return acc
  }, {})

  const members = memberships.map((row) => {
    const project = row.projects as unknown as { creator_id: string }
    return {
      id: row.user_id,
      email: row.user_id,
      roleId: rolesByUser[row.user_id]?.roleId ?? null,
      roleName: rolesByUser[row.user_id]?.roleName ?? null,
      isCreator: project.creator_id === row.user_id,
    }
  })

  return NextResponse.json({ data: members })
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
  const { project_id, user_id, role_id } = body

  if (!project_id || !user_id) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id and user_id are required' } },
      { status: 400 },
    )
  }

  const { error: memberError } = await supabase
    .from('user_projects')
    .insert({ user_id, project_id })

  if (memberError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: memberError.message } },
      { status: 500 },
    )
  }

  if (role_id) {
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id, role_id })

    if (roleError) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: roleError.message } },
        { status: 500 },
      )
    }
  }

  return NextResponse.json(
    { data: { userId: user_id, projectId: project_id, roleId: role_id } },
    { status: 201 },
  )
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const userId = searchParams.get('user_id')

  if (!projectId || !userId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id and user_id are required' } },
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

  // Cannot remove self
  if (userId === user.id) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'You cannot remove yourself from the project' } },
      { status: 400 },
    )
  }

  // Cannot remove the project creator
  const { data: project } = await supabase
    .from('projects')
    .select('creator_id')
    .eq('id', projectId)
    .single()

  if (project?.creator_id === userId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'The project owner cannot be removed' } },
      { status: 400 },
    )
  }

  // Remove user roles for this project first
  const { data: roles } = await supabase
    .from('roles')
    .select('id')
    .eq('project_id', projectId)

  const roleIds = (roles ?? []).map((r) => r.id)

  if (roleIds.length > 0) {
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('role_id', roleIds)
  }

  // Remove from project
  const { error } = await supabase
    .from('user_projects')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { userId, projectId } })
}
