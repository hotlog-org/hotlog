import { z } from 'zod'

import { createEnv } from '@t3-oss/env-nextjs'

// client env
export const envClient = createEnv({
  client: {
    NEXT_PUBLIC_CLIENT_WEB_URL: z
      .string()
      .min(1, { message: 'NEXT_PUBLIC_CLIENT_WEB_URL is required' }),
    NEXT_PUBLIC_CLIENT_API_URL: z
      .string()
      .min(1, { message: 'NEXT_PUBLIC_CLIENT_API_URL is required' }),
    NEXT_PUBLIC_BETTER_AUTH_URL: z
      .string()
      .min(1, { message: 'NEXT_PUBLIC_BETTER_AUTH_URL is required' }),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: {
    NEXT_PUBLIC_CLIENT_WEB_URL: process.env.NEXT_PUBLIC_CLIENT_WEB_URL,
    NEXT_PUBLIC_CLIENT_API_URL: process.env.NEXT_PUBLIC_CLIENT_API_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  },
})
