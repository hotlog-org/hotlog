import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

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

  const body = await request.json()
  const { layout_id, creates, updates, deletes } = body ?? {}

  if (!layout_id || typeof layout_id !== 'number') {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'layout_id is required' } },
      { status: 400 },
    )
  }

  if (Array.isArray(deletes) && deletes.length > 0) {
    const { error } = await supabase
      .from('components')
      .delete()
      .in('id', deletes)

    if (error) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: `Delete failed: ${error.message}` } },
        { status: 500 },
      )
    }
  }

  if (Array.isArray(updates) && updates.length > 0) {
    for (const item of updates) {
      const updateFields: Record<string, unknown> = {}

      if (item.title !== undefined) updateFields.name = item.title
      if (item.description !== undefined)
        updateFields.description = item.description
      if (item.visualization !== undefined)
        updateFields.visualization = item.visualization
      if (item.schema_id !== undefined)
        updateFields.schema_id = item.schema_id
      if (item.bindings !== undefined) updateFields.inputs_ids = item.bindings
      if (item.index !== undefined) updateFields.index = item.index
      if (item.span !== undefined) updateFields.span = item.span

      if (Object.keys(updateFields).length > 0) {
        const { error } = await supabase
          .from('components')
          .update(updateFields as any)
          .eq('id', item.id)

        if (error) {
          return NextResponse.json<IApiErrorResponse>(
            {
              error: {
                message: `Update failed for ${item.id}: ${error.message}`,
              },
            },
            { status: 500 },
          )
        }
      }
    }
  }

  if (Array.isArray(creates) && creates.length > 0) {
    const rows = creates.map(
      (c: {
        title: string
        description: string
        visualization: string
        schema_id: string | null
        bindings: unknown
        index: number
        span?: string
      }) => ({
        layout_id,
        name: c.title ?? '',
        description: c.description ?? '',
        visualization: c.visualization,
        schema_id: c.schema_id,
        inputs_ids: c.bindings ?? [],
        index: c.index,
        span: c.span ?? 'full',
        type: 'TIME_SERIES' as const,
      }),
    )

    const { error } = await supabase.from('components').insert(rows as any)

    if (error) {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: `Insert failed: ${error.message}` } },
        { status: 500 },
      )
    }
  }

  const { data: allComponents, error: fetchError } = await supabase
    .from('components')
    .select(
      'id, name, description, visualization, schema_id, inputs_ids, index, span' as '*',
    )
    .eq('layout_id', layout_id)
    .order('index', { ascending: true })

  if (fetchError) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: fetchError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: ((allComponents ?? []) as unknown as ComponentRow[]).map(
      mapComponent,
    ),
  })
}
