import { NextResponse } from 'next/server'

import { ERoutes } from '@/config/routes'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

const defaultNextPath = `/${routing.defaultLocale}${ERoutes.DASHBOARD}`
const defaultSignInPath = `/${routing.defaultLocale}${ERoutes.SIGN_IN}`

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const nextPath = next?.startsWith('/') ? next : defaultNextPath

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL(defaultSignInPath, requestUrl.origin))
}
