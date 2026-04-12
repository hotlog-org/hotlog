'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { useModulesStore } from '@/modules/modules/modules.store'
import { useCreateLayoutMutation } from '@/shared/api/layout'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import type { DashboardSidebarCreateModuleProps } from './create-module.component'

export const useDashboardSidebarCreateModuleService = (
  _props: DashboardSidebarCreateModuleProps,
) => {
  const t = useTranslations('modules.dashboard.modules')
  const sidebarTranslations = useTranslations('modules.dashboard.sidebar')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')

  const selectedProjectId = useDashboardProject(
    (state) => state.selectedProjectId,
  )
  const createLayoutMutation = useCreateLayoutMutation(selectedProjectId)
  const setSelectedModuleId = useModulesStore(
    (state) => state.setSelectedModuleId,
  )

  const handleSubmit = async () => {
    if (!name.trim() || !selectedProjectId) return

    const result = await createLayoutMutation.mutateAsync({
      project_id: selectedProjectId,
      name: name.trim(),
      color,
    })

    setSelectedModuleId(String(result.data.id))
    setName('')
    setOpen(false)
  }

  return {
    t,
    buttonLabel: sidebarTranslations('groups.addNew'),
    open,
    setOpen,
    name,
    setName,
    color,
    setColor,
    handleSubmit,
    isCreating: createLayoutMutation.isPending,
  }
}
