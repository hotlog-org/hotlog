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
  const { role_id, layout_id } = body ?? {}

  if (!role_id || !layout_id) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'role_id and layout_id are required' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('role_layouts' as any)
    .insert({ role_id, layout_id })
    .select('id, role_id, layout_id')
    .single()

  if (error) {
    const status = error.code === '23505' ? 409 : 500
    const message =
      error.code === '23505'
        ? 'This role is already assigned to this layout'
        : error.message
    return NextResponse.json<IApiErrorResponse>(
      { error: { message } },
      { status },
    )
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
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
  const { role_id, layout_id } = body ?? {}

  if (!role_id || !layout_id) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'role_id and layout_id are required' } },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('role_layouts' as any)
    .delete()
    .eq('role_id', role_id)
    .eq('layout_id', layout_id)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: null })
}
