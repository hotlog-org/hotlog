import { ERoutes } from '@/config/routes'
import { auth } from '@/lib/better-auth/auth'
import { SchemaBuilderComponent } from '@/modules/schema-builder'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

interface SchemaDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SchemaDetailPage({
  params,
}: SchemaDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  const { id } = await params

  return (
    <div className='mx-auto max-w-5xl'>
      <SchemaBuilderComponent schemaId={id} />
    </div>
  )
}
