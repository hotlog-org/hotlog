'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { useModulesStore } from '@/modules/modules/modules.store'
import { useDeleteLayoutMutation, useLayoutsQuery } from '@/shared/api/layout'
import { useSidebar } from '@/shared/ui/sidebar'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useUserPermissions } from '@/shared/api/user-permission/user-permission.hook'
import type { ILayoutDto } from '@/shared/api/interface'

function layoutToSidebarModule(dto: ILayoutDto) {
  return {
    id: String(dto.id),
    name: dto.name,
    color: dto.color,
  }
}

export const useDashboardSidebarContentService = () => {
  const t = useTranslations('modules.dashboard.sidebar')
  const { state: sidebarState } = useSidebar()

  const selectedProjectId = useDashboardProject(
    (state) => state.selectedProjectId,
  )
  const layoutsQuery = useLayoutsQuery(selectedProjectId)
  const deleteLayoutMutation = useDeleteLayoutMutation(selectedProjectId)
  const { can } = useUserPermissions(selectedProjectId)

  const modules = useMemo(
    () => (layoutsQuery.data?.data ?? []).map(layoutToSidebarModule),
    [layoutsQuery.data],
  )

  const setSelectedModuleId = useModulesStore(
    (state) => state.setSelectedModuleId,
  )
  const selectedModuleId = useModulesStore((state) => state.selectedModuleId)

  const deleteModule = (id: string) => {
    deleteLayoutMutation.mutate(Number(id))
  }

  return {
    t,
    modules,
    selectedModuleId,
    setSelectedModuleId,
    deleteModule,
    sidebarState,
    canCreateLayouts: can('create:layouts'),
    canDeleteLayouts: can('delete:layouts'),
  }
}
