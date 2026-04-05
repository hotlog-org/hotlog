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
  const { role_id, permission_id } = body

  if (!role_id || !permission_id) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'role_id and permission_id are required' } },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('role_permissions')
    .insert({ role_id, permission_id })

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { data: { roleId: role_id, permissionId: permission_id } },
    { status: 201 },
  )
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get('role_id')
  const permissionId = searchParams.get('permission_id')

  if (!roleId || !permissionId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'role_id and permission_id are required' } },
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
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { roleId, permissionId } })
}
