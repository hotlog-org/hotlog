import { ERoutes } from '@/config/routes'
import { auth } from '@/lib/better-auth/auth'
import { SchemaListComponent } from '@/modules/schema-builder'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SchemaListPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  return (
    <div className='mx-auto max-w-6xl'>
      <SchemaListComponent />
    </div>
  )
}
