import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mapPgError(err: { code?: string; message: string }) {
  if (err.message.includes('invalid_api_key')) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Invalid API key' } },
      { status: 401 },
    )
  }
  return NextResponse.json<IApiErrorResponse>(
    { error: { message: err.message } },
    { status: 500 },
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const apiKey = /^bearer\s+/i.test(authHeader)
    ? authHeader.replace(/^bearer\s+/i, '').trim()
    : ''

  if (!apiKey) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Missing Bearer API key' } },
      { status: 401 },
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_project_schemas_for_sdk', {
    p_api_key: apiKey,
  })

  if (error) return mapPgError(error)

  return NextResponse.json({ data }, { status: 200 })
}
