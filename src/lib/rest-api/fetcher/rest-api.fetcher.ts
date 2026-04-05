import ky, { type KyInstance } from 'ky'

import { envClient } from '@/config/env'

// Use the current origin in the browser so API calls work on any domain
// (localhost, vercel preview, production). Fall back to the env var for
// server-side execution.
const prefixUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api`
    : envClient.NEXT_PUBLIC_CLIENT_API_URL

// fetcher
export const restApiFetcher: KyInstance = ky.create({
  prefixUrl,
  credentials: 'include',
  throwHttpErrors: false,
})
