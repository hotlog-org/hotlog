import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: { message: 'Cross-origin mutations are not allowed' } },
      { status: 403 },
    )
  }
  const { id } = await params
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      { error: { message: 'Project must be a valid UUID' } },
      { status: 400 },
    )
  }
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user)
    return NextResponse.json(
      { error: { message: 'Unauthorized' } },
      { status: 401 },
    )

  // No user ID is accepted. Authorization, owner protection and role cleanup
  // are handled together in the database transaction.
  const { data, error } = await supabase.rpc('leave_project', {
    p_project_id: id,
  })
  if (error) {
    if (error.code === 'PGRST202') {
      return NextResponse.json(
        {
          error: {
            message:
              'Leaving projects is not available until database setup is complete',
          },
        },
        { status: 503 },
      )
    }
    const status =
      error.code === '28000'
        ? 401
        : error.code === '42501'
          ? 403
          : error.code === 'P0002'
            ? 404
            : error.code === '22023'
              ? 400
              : 500
    return NextResponse.json({ error: { message: error.message } }, { status })
  }
  if (data !== id)
    return NextResponse.json(
      { error: { message: 'Project leave was not confirmed' } },
      { status: 500 },
    )
  return NextResponse.json({ data: { id } })
}
