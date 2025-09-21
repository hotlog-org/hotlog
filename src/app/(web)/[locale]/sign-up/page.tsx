import { auth } from '@/lib/better-auth/auth'
import { SignUpComponent } from '@/modules/sign-up'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SignUpPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session.user) {
    redirect('/')
  }

  return <SignUpComponent />
}
