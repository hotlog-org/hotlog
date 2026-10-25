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

  // Existing RLS permits only the caller's memberships and owned projects.
  // Do not make this fundamental read depend on an undeployed settings RPC.
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at, creator_id')
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

  const rows = data ?? []
  const capabilities = await Promise.all(
    rows.map((project) =>
      project.creator_id === user.id
        ? Promise.resolve({ data: true, error: null })
        : supabase.rpc('has_permission', {
            p_project_id: project.id,
            p_action: 'delete',
            p_subject: 'projects',
          }),
    ),
  )
  if (capabilities.some((result) => result.error)) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Could not load project permissions' } },
      { status: 500 },
    )
  }
  const projects: IUserProjectDto[] = rows.map((project, index) => ({
    id: project.id,
    name: project.name,
    createdAt: project.created_at,
    isCreator: project.creator_id === user.id,
    canDelete: capabilities[index].data === true,
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }
  const name =
    body && typeof body === 'object' && 'name' in body ? body.name : null

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'name is required' } },
      { status: 400 },
    )
  }

  const { data: project, error } = await supabase
    .rpc('create_project', { p_name: name })
    .single()

  if (error || !project) {
    const status =
      error?.code === '28000'
        ? 401
        : error?.code === '42501'
          ? 403
          : error?.code === '22023'
            ? 400
            : 500
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error?.message ?? 'Failed to create project' } },
      { status },
    )
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

  const { data: deleted, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  if (!deleted) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message:
            'Project not found or you do not have permission to delete it',
        },
      },
      { status: 404 },
    )
  }

  return NextResponse.json({ data: { id: deleted.id } })
}
