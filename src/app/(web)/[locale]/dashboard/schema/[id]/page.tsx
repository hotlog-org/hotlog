import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/client'
import { SchemaComponent } from '@/modules/schema'
import { redirect } from 'next/navigation'

interface SchemaDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SchemaDetailPage({
  params,
}: SchemaDetailPageProps) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ERoutes.SIGN_IN)
  }

  return (
    <div className='mx-auto max-w-5xl'>
      <SchemaComponent />
    </div>
  )
}
