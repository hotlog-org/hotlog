import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/client'
import { ModulesComponent } from '@/modules/modules'
import { redirect } from 'next/navigation'

interface ModulesDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ModulesDetailPage({
  params,
}: ModulesDetailPageProps) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ERoutes.SIGN_IN)
  }

  const { id } = await params

  return <ModulesComponent moduleId={id} />
}
