import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { SchemaComponent } from '@/modules/schema'
import { redirect } from 'next/navigation'

export default async function SchemaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <SchemaComponent />
}
