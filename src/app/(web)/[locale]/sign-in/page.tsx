import { auth } from '@/lib/better-auth/auth'
import { LoginComponent } from '@/modules/login'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session.user) {
    redirect('/')
  }

  return <LoginComponent />
}
