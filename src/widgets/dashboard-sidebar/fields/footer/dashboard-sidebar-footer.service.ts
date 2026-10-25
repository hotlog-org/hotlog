import { useAuth } from '@/shared/hooks'
import { useSidebar } from '@/shared/ui/sidebar'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export const useDashboardSidebarFooterService = () => {
  const t = useTranslations('modules.dashboard.sidebar.footer')
  const { isLoading, user } = useAuth()
  const { state: sidebarState } = useSidebar()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return {
    t,
    isLoading,
    user,
    sidebarState,
    settingsOpen,
    openSettings: () => {
      if (!isLoading && user) setSettingsOpen(true)
    },
    closeSettings: () => setSettingsOpen(false),
  }
}
