import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { ERoutes } from '@/config/routes'
import {
  authDestination,
  authLocale,
  safeAuthRedirect,
} from '@/lib/supabase/auth-redirect'
import { createClient } from '@/lib/supabase/server'

const emailTypes: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = emailTypes.find((type) => type === url.searchParams.get('type'))
  const locale = authLocale(url.searchParams.get('locale'))
  const nextPath =
    type === 'recovery'
      ? `/${locale}${ERoutes.RESET_PASSWORD}`
      : safeAuthRedirect(
          url.searchParams.get('next'),
          url.origin,
          `/${locale}${ERoutes.DASHBOARD}`,
        )

  try {
    if (token_hash && type) {
      const supabase = await createClient()
      const { error } = await supabase.auth.verifyOtp({ type, token_hash })
      if (!error) {
        return NextResponse.redirect(authDestination(nextPath, url.origin))
      }
    }
  } catch {
    // Return only a fixed error state, never provider messages or tokens.
  }

  return NextResponse.redirect(
    new URL(
      `/${locale}${ERoutes.SIGN_IN}?${type === 'recovery' ? 'recovery' : 'auth'}=invalid`,
      url.origin,
    ),
  )
}
