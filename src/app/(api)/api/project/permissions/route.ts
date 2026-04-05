import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

export async function GET() {
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

  const { data: permissions, error } = await supabase
    .from('permissions')
    .select('id, action, subject')
    .order('subject', { ascending: true })
    .order('action', { ascending: true })

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: permissions ?? [] })
}
