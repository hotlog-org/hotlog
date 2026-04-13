import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

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
  const { token } = body

  if (!token) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'token is required' } },
      { status: 400 },
    )
  }

  // Call the security definer function to accept the invitation
  const { data, error } = await supabase.rpc(
    'accept_invitation' as never,
    { p_token: token } as never,
  )

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const result = data as unknown as {
    error?: string
    success?: boolean
    project_id?: string
    already_member?: boolean
  }

  if (result.error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: result.error } },
      { status: 400 },
    )
  }

  return NextResponse.json({
    data: {
      projectId: result.project_id,
      alreadyMember: result.already_member ?? false,
    },
  })
}
