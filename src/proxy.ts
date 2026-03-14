import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { routing } from './i18n/routing'
import { updateSession } from '@/lib/supabase/proxy'

const proxyMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const authResponse = await updateSession(request)
  const intlResponse = proxyMiddleware(request)

  authResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie)
  })

  return intlResponse
}

export default proxy

export const config = {
  matcher: [
    '/((?!api|trpc|_next|_vercel|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|.*\\..*).*)',
  ],
}
