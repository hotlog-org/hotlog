import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/client'
import { SchemaComponent } from '@/modules/schema'
import { redirect } from 'next/navigation'

export default async function SchemaPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <SchemaComponent />
}
