import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const failure = (message: string, status: number) =>
  NextResponse.json({ error: { message } }, { status })

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin)
    return failure('Cross-origin mutations are not allowed', 403)
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return failure('Unauthorized', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return failure('Invalid JSON body', 400)
  }
  if (
    !user.email ||
    !body ||
    typeof body !== 'object' ||
    !('confirmation' in body) ||
    body.confirmation !== user.email
  ) {
    return failure('Type your account email to confirm deletion', 400)
  }

  // Use verified AMR claims, not token issue time (which refreshes silently).
  // Supports both password and social sign-ins, but not a recovery-only token.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const now = Math.floor(Date.now() / 1000)
  const recentLogin =
    claims?.sub === user.id &&
    Array.isArray(claims.amr) &&
    claims.amr.some((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return false
      const { method, timestamp } = entry as Record<string, unknown>
      return (
        typeof method === 'string' &&
        ['password', 'oauth', 'otp', 'totp', 'sso/saml'].includes(method) &&
        typeof timestamp === 'number' &&
        timestamp > now - 900 &&
        timestamp <= now + 60
      )
    })
  if (claimsError || !recentLogin) {
    return failure(
      'Sign out and sign in again before deleting your account (a login within the last 15 minutes is required)',
      403,
    )
  }

  // This RPC is installed only with the restrictive ownership FK. Do not fall
  // back to a count-only check: that would reopen the project-creation race.
  const { data: preparedId, error: preparationError } = await supabase.rpc(
    'prepare_account_deletion',
  )
  if (preparationError) {
    if (preparationError.code === '23503')
      return failure(
        'Delete your owned projects before deleting your account',
        409,
      )
    return failure('Safe account deletion is not available yet', 503)
  }
  if (preparedId !== user.id)
    return failure('Safe account deletion is not available yet', 503)

  const admin = createAdminClient()
  if (!admin)
    return failure('Account deletion is not configured on this server', 503)
  // The target always comes from the validated session, never from the body.
  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id)
  if (deletionError) {
    // Ownership may have changed after preflight. The FK still prevents cascade.
    const { error: recheckError } = await supabase.rpc(
      'prepare_account_deletion',
    )
    if (recheckError?.code === '23503')
      return failure(
        'Delete your owned projects before deleting your account',
        409,
      )
    return failure(
      'Account deletion failed. Your account has not been reported as deleted; refresh before retrying.',
      500,
    )
  }
  // Clear the caller's cookies even though Auth has already removed the user.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  return NextResponse.json({ data: { id: user.id } })
}
