import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'
import type { Json } from '../../../../../../../database.types'

interface ComponentRow {
  id: string
  name: string
  description: string
  visualization: string
  schema_id: string | null
  inputs_ids: unknown
  index: number
  span: string
}

const mapComponent = (row: ComponentRow) => ({
  id: row.id,
  visualization: row.visualization,
  schemaId: row.schema_id,
  bindings: Array.isArray(row.inputs_ids) ? row.inputs_ids : [],
  title: row.name,
  description: row.description,
  index: row.index,
  span: row.span ?? 'full',
})

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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Component batch must be an object' } },
      { status: 400 },
    )
  }
  const {
    layout_id,
    creates = [],
    updates = [],
    deletes = [],
  } = body as Record<string, Json | undefined>

  if (
    typeof layout_id !== 'number' ||
    !Number.isSafeInteger(layout_id) ||
    layout_id <= 0
  ) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'layout_id must be a positive safe integer' } },
      { status: 400 },
    )
  }
  if (
    !Array.isArray(creates) ||
    !Array.isArray(updates) ||
    !Array.isArray(deletes)
  ) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'creates, updates, and deletes must be arrays' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase.rpc('batch_layout_components', {
    p_layout_id: layout_id,
    p_creates: creates,
    p_updates: updates,
    p_deletes: deletes,
  })

  if (error || !data) {
    const status =
      error?.code === '28000'
        ? 401
        : error?.code === '42501'
          ? 403
          : ['22023', '22P02', '22003'].includes(error?.code ?? '')
            ? 400
            : 500
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error?.message ?? 'Failed to save components' } },
      { status },
    )
  }

  return NextResponse.json({ data: data.map(mapComponent) })
}
