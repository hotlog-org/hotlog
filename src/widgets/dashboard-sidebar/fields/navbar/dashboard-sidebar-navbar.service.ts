import { usePathname } from '@/i18n/navigation'

export const useDashboardSidebarNavbarService = () => {
  const pathname = usePathname()
  const pathSegments = pathname.split('/').filter(Boolean)

  return {
    pathSegments,
    pathname,
  }
}
