import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { SchemaComponent } from '@/modules/schema'
import { redirect } from 'next/navigation'

export default async function SchemaDetailPage() {
  const supabase = await createClient()

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
