'use client'

import { envClient } from '@/config/env'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: envClient.NEXT_PUBLIC_BETTER_AUTH_URL,
})
