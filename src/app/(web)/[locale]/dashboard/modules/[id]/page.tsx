import { ERoutes } from '@/config/routes'
import { auth } from '@/lib/better-auth/auth'
import { ModulesComponent } from '@/modules/modules'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

interface ModulesDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ModulesDetailPage({
  params,
}: ModulesDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  const { id } = await params

  return <ModulesComponent moduleId={id} />
}

