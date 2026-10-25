import { NextResponse } from 'next/server'

import { ERoutes } from '@/config/routes'
import { routing } from '@/i18n/routing'
import {
  authDestination,
  authLocale,
  safeAuthRedirect,
} from '@/lib/supabase/auth-redirect'
import { createClient } from '@/lib/supabase/server'

const defaultNextPath = `/${routing.defaultLocale}${ERoutes.DASHBOARD}`
const defaultSignInPath = `/${routing.defaultLocale}${ERoutes.SIGN_IN}`

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = safeAuthRedirect(
    requestUrl.searchParams.get('next'),
    requestUrl.origin,
    defaultNextPath,
  )
  const recovery = requestUrl.searchParams.get('recovery') === '1'
  const locale = authLocale(requestUrl.pathname.split('/')[1])
  const destination = recovery
    ? `/${locale}${ERoutes.RESET_PASSWORD}`
    : nextPath

  try {
    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(
          authDestination(destination, requestUrl.origin),
        )
      }
    }
  } catch {
    // Provider errors must not expose recovery credentials in a redirect or log.
  }

  return NextResponse.redirect(
    new URL(
      recovery
        ? `/${locale}${ERoutes.SIGN_IN}?recovery=invalid`
        : defaultSignInPath,
      requestUrl.origin,
    ),
  )
}
