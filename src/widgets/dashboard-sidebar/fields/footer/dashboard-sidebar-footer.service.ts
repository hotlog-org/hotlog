import { ERoutes } from '@/config/routes'
import { useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/better-auth'
import { useAuth, useIsMobile } from '@/shared/hooks'
import { useTranslations } from 'next-intl'

export const useDashboardSidebarFooterService = () => {
  const t = useTranslations('modules.dashboard.sidebar.footer')
  const { isLoading, user } = useAuth()
  const isMobile = useIsMobile()
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push(ERoutes.BASE)
  }

  return {
    t,
    isLoading,
    isMobile,
    user,
    handleLogout,
  }
}
