import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { OverviewComponent } from '@/modules/overview'

import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <OverviewComponent />
}
