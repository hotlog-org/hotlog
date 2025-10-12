import { ERoutes } from '@/config/routes'
import { Link } from '@/i18n/navigation'
import { auth } from '@/lib/better-auth/auth'
import { GroupComponent } from '@/modules/group'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

interface GroupPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  const { id } = await params

  return (
    <div className='container mx-auto p-6'>
      <Link href={'vova/12'}>asdasd</Link>
      <GroupComponent groupId={id} />
    </div>
  )
}
