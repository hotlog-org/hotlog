'use client'

'use client'

import { useModulesStore } from '@/modules/modules/modules.store'
import { useSidebar } from '@/shared/ui/sidebar'
import { useTranslations } from 'next-intl'

export const useDashboardSidebarContentService = () => {
  const t = useTranslations('modules.dashboard.sidebar')
  const { state: sidebarState } = useSidebar()
  const modules = useModulesStore((state) => state.modules)
  const setSelectedModuleId = useModulesStore(
    (state) => state.setSelectedModuleId,
  )
  const selectedModuleId = useModulesStore((state) => state.selectedModuleId)
  const deleteModule = useModulesStore((state) => state.deleteModule)

  return {
    t,
    modules,
    selectedModuleId,
    setSelectedModuleId,
    deleteModule,
    sidebarState,
  }
}
