import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/config/env/env.server'
import type { Database } from '../../../database.types'

// Never import this module into client components or accept credentials/URLs
// from a request. Only the account-deletion route uses this privileged client.
export function createAdminClient() {
  const key = envServer.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!key || !url) return null
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
