import { ERoutes } from '@/config/routes'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth, useIsMobile } from '@/shared/hooks'
import { useSidebar } from '@/shared/ui/sidebar'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export const useDashboardSidebarFooterService = () => {
  const t = useTranslations('modules.dashboard.sidebar.footer')
  const { isLoading, user } = useAuth()
  const [supabase] = useState(createClient)
  const { state: sidebarState } = useSidebar()
  const isMobile = useIsMobile()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push(ERoutes.BASE)
  }

  return {
    t,
    isLoading,
    isMobile,
    user,
    handleLogout,
    sidebarState,
  }
}
