import { useDashboardNavbarExtra } from '@/shared/store/dashboard-navbar-extra.store'
import { useTranslations } from 'next-intl'
import { EventsExtraComponent } from './events-extra.component'
import { useEffect } from 'react'

const useEventsService = () => {
  const t = useTranslations('modules.login')
  const useExtra = useDashboardNavbarExtra((s) => s.handleDashboardNavbarExtra)

  useEffect(() => {
    useExtra({
      component: EventsExtraComponent(),
    })
  }, [])
}

export default useEventsService
