import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { routing } from './i18n/routing'

const proxyMiddleware = createMiddleware(routing)

export function proxy(request: NextRequest) {
  return proxyMiddleware(request)
}

export default proxy

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
