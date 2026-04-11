import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { ModulesComponent } from '@/modules/modules'
import { redirect } from 'next/navigation'

export default async function ModulesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <ModulesComponent />
}

