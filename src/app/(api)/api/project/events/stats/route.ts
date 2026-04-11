import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

const DEFAULT_DAYS = 30
const MAX_DAYS = 90

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id is required' } },
      { status: 400 },
    )
  }

  const daysParam = Number(searchParams.get('days') ?? DEFAULT_DAYS)
  const days = Number.isFinite(daysParam)
    ? Math.min(Math.max(1, Math.trunc(daysParam)), MAX_DAYS)
    : DEFAULT_DAYS

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

  const { data, error } = await supabase.rpc('events_daily_counts', {
    p_project_id: projectId,
    p_days: days,
  })

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const rows = (data ?? []).map((row) => ({
    day: row.day,
    count: Number(row.count ?? 0),
  }))

  return NextResponse.json({ data: rows })
}
