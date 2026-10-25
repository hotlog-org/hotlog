import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const metadataColumns = 'id, project_id, key_prefix, last_used_at, revoked_at'
const noStore = { 'Cache-Control': 'no-store' }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const validId = (id: unknown): id is number =>
  typeof id === 'number' && Number.isSafeInteger(id) && id > 0
const fail = (message: string, status: number) =>
  NextResponse.json({ error: { message } }, { status, headers: noStore })
const rpcFailure = (code?: string) => {
  if (code === '28000') return fail('Unauthorized', 401)
  if (code === '42501') return fail('Permission denied', 403)
  if (code === 'P0002')
    return fail('Selected active API key or project not found', 404)
  if (code === '22023' || code === '22P02')
    return fail('Invalid API key request', 400)
  return fail('API key operation failed', 500)
}

export async function GET(request: NextRequest) {
  const projectId = new URL(request.url).searchParams.get('project_id')
  if (!projectId || !uuid.test(projectId))
    return fail('Valid project_id is required', 400)
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return fail('Unauthorized', 401)
  const { data, error } = await supabase
    .from('api_keys')
    .select(metadataColumns)
    .eq('project_id', projectId)
    .order('id', { ascending: false })
  if (error) return rpcFailure(error.code)
  return NextResponse.json({ data: data ?? [] }, { headers: noStore })
}

// POST creates; PATCH atomically replaces exactly one selected active key.
async function issue(request: NextRequest, rotate: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return fail('Unauthorized', 401)
  let body
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON', 400)
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    typeof body.project_id !== 'string' ||
    !uuid.test(body.project_id) ||
    (rotate && !validId(body.id))
  )
    return fail('Invalid API key request', 400)
  const { data, error } = await supabase
    .rpc('create_api_key', {
      p_project_id: body.project_id,
      ...(rotate ? { p_replace_key_id: body.id } : {}),
    })
    .single()
  if (error || !data) return rpcFailure(error?.code)
  return NextResponse.json({ data }, { status: 201, headers: noStore })
}
export const POST = (request: NextRequest) => issue(request, false)
export const PATCH = (request: NextRequest) => issue(request, true)

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!validId(id)) return fail('Valid id is required', 400)
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return fail('Unauthorized', 401)
  const { data, error } = await supabase.rpc('revoke_api_key', { p_key_id: id })
  if (error) return rpcFailure(error.code)
  if (data !== id) return fail('API key revocation failed', 500)
  return NextResponse.json({ data: { id } }, { headers: noStore })
}
