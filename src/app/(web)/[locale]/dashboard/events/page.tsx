import { ERoutes } from '@/config/routes'
import { auth } from '@/lib/better-auth/auth'
import { EventsComponent } from '@/modules/events/events.component'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function EventsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(ERoutes.SIGN_IN)
  }

  return <EventsComponent />
}
