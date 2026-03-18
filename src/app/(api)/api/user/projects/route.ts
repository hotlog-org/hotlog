import { NextResponse } from 'next/server'

import {
  type IApiErrorResponse,
  type IUserProjectDto,
  type IUserProjectsResponse,
} from '@/shared/interface/api/interface'
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
