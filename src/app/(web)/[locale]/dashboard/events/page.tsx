import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { EventsComponent } from '@/modules/events/events.component'
import { redirect } from 'next/navigation'

export default async function EventsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <EventsComponent />
}
