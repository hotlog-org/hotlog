import { type NextRequest, NextResponse } from 'next/server'

import {
  type IApiErrorResponse,
  type IUserProjectDto,
  type IUserProjectsResponse,
} from '@/shared/api/interface'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: 'Unauthorized',
        },
      },
      { status: 401 },
    )
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at, creator_id, user_projects!inner(user_id)')
    .eq('user_projects.user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: error.message,
        },
      },
      { status: 500 },
    )
  }

  const projects: IUserProjectDto[] = (data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    createdAt: project.created_at,
    isCreator: project.creator_id == user.id,
  }))

  return NextResponse.json<IUserProjectsResponse>({
    data: projects,
  })
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
  const name = body?.name

  if (!name || typeof name !== 'string') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'name is required' } },
      { status: 400 },
    )
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ name, creator_id: user.id })
    .select('id, name, created_at, creator_id')
    .single()

  if (projectError || !project) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: projectError?.message ?? 'Failed to create project' } },
      { status: 500 },
    )
  }

  // Add creator as project member
  const { error: membershipError } = await supabase
    .from('user_projects')
    .insert({ user_id: user.id, project_id: project.id })

  if (membershipError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: membershipError.message } },
      { status: 500 },
    )
  }

  // Create "Owner" role for the project
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .insert({ name: 'Owner', project_id: project.id })
    .select('id')
    .single()

  if (roleError || !role) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: roleError?.message ?? 'Failed to create role' } },
      { status: 500 },
    )
  }

  // Assign the owner role to the creator
  const { error: userRoleError } = await supabase
    .from('user_roles')
    .insert({ user_id: user.id, role_id: role.id })

  if (userRoleError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: userRoleError.message } },
      { status: 500 },
    )
  }

  // Fetch all permissions and link them to the owner role
  const { data: allPermissions, error: permissionsError } = await supabase
    .from('permissions')
    .select('id')

  if (permissionsError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: permissionsError.message } },
      { status: 500 },
    )
  }

  if (allPermissions && allPermissions.length > 0) {
    const rolePermissions = allPermissions.map((p) => ({
      role_id: role.id,
      permission_id: p.id,
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

  const projectDto: IUserProjectDto = {
    id: project.id,
    name: project.name,
    createdAt: project.created_at,
    isCreator: true,
  }

  return NextResponse.json<IUserProjectsResponse>(
    { data: [projectDto] },
    { status: 201 },
  )
}

export async function DELETE(request: NextRequest) {
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

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { id: projectId } })
}
