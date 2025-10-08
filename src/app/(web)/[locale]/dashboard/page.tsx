import { ERoutes } from '@/config/routes'
import { auth } from '@/lib/better-auth/auth'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <p>hello</p>
}
