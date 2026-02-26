import { z } from 'zod'

import { createEnv } from '@t3-oss/env-nextjs'

// env server
export const envServer = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
    BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    GO_API_BASE_URL: z
      .string()
      .url('GO_API_BASE_URL must be a valid URL')
      .optional()
      .default('http://127.0.0.1:8080'),
    GO_API_INTERNAL_TOKEN: z
      .string()
      .min(1, 'GO_API_INTERNAL_TOKEN is required')
      .optional()
      .default('dev-internal-token'),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    GO_API_BASE_URL: process.env.GO_API_BASE_URL,
    GO_API_INTERNAL_TOKEN: process.env.GO_API_INTERNAL_TOKEN,
  },
})
