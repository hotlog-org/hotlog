import { ERoutes } from '@/config/routes'
import { auth } from '@/lib/better-auth/auth'
import { RecordingsComponent } from '@/modules/recordings'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RecordingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <RecordingsComponent />
}

