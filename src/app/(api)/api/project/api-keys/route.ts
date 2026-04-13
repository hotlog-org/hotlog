import { type NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'node:crypto'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

export async function GET(request: NextRequest) {
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

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, key, project_id')
    .eq('project_id', projectId)
    .order('id', { ascending: false })

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: data ?? [] })
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
  const { project_id } = body

  if (!project_id) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id is required' } },
      { status: 400 },
    )
  }

  // Generate the key in Node so we can compute hash + prefix in the same insert.
  // Stored as UUID (column type), hashed into key_hash for fast/safe lookups
  // by the public ingestion endpoint.
  const key = randomUUID()
  const keyHash = createHash('sha256').update(key).digest('hex')
  const keyPrefix = key.slice(0, 8)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      project_id,
      key,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select('id, key, project_id')
    .single()

  if (error || !data) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error?.message ?? 'Failed to create api key' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const idParam = searchParams.get('id')

  if (!idParam) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'id is required' } },
      { status: 400 },
    )
  }

  const id = Number(idParam)
  if (!Number.isFinite(id)) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'id must be a number' } },
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

  const { error } = await supabase.from('api_keys').delete().eq('id', id)

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { id } })
}
