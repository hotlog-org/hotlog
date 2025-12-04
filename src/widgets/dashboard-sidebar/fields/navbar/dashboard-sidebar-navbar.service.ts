import { usePathname } from '@/i18n/navigation'
import { useDashboardNavbarExtra } from '../../../../shared/store/dashboard-navbar-extra.store'

export const useDashboardSidebarNavbarService = () => {
  const pathname = usePathname()
  const pathSegments = pathname.split('/').filter(Boolean)
  const extraComponent = useDashboardNavbarExtra((s) => s.component)

  return {
    pathSegments,
    pathname,
    extraComponent,
  }
}
