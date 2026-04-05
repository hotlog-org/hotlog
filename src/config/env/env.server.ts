import { z } from 'zod'

import { createEnv } from '@t3-oss/env-nextjs'

// env server
export const envServer = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
  },
})
