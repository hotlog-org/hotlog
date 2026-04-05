import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { SignUpComponent } from '@/modules/sign-up'
import { redirect } from 'next/navigation'

export default async function SignUpPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(ERoutes.BASE)
  }

  return <SignUpComponent />
}
