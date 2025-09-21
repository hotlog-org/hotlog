import { envServer } from '@/config/env'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    database: envServer.POSTGRES_DB,
    user: envServer.POSTGRES_USER,
    password: envServer.POSTGRES_PASSWORD,
    port: 5432,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  plugins: [nextCookies()],
})
