import { ERoutes } from '@/config/routes'
import { auth } from '@/lib/better-auth/auth'
import { IdentitiesComponent, getGroups } from '@/modules/identities'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

interface IdentityPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function IdentityPage({ params }: IdentityPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  const groups = await getGroups()

  return <IdentitiesComponent groups={groups} />
}
