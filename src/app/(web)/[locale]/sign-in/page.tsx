import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { LoginComponent } from '@/modules/login'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(ERoutes.BASE)
  }

  return <LoginComponent />
}
