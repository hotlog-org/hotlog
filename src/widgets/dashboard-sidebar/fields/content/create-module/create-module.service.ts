'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { useModulesStore } from '@/modules/modules/modules.store'
import {
  useAddRoleLayoutMutation,
  useCreateLayoutMutation,
} from '@/shared/api/layout'
import { useProjectRolesQuery } from '@/shared/api/project-role/project-role.hook'
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
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  const selectedProjectId = useDashboardProject(
    (state) => state.selectedProjectId,
  )
  const createLayoutMutation = useCreateLayoutMutation(selectedProjectId)
  const addRoleLayoutMutation = useAddRoleLayoutMutation(selectedProjectId)
  const rolesQuery = useProjectRolesQuery(selectedProjectId)
  const setSelectedModuleId = useModulesStore(
    (state) => state.setSelectedModuleId,
  )

  const roles = rolesQuery.data?.data ?? []

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    )
  }

  const handleSubmit = async () => {
    if (!name.trim() || !selectedProjectId) return

    const result = await createLayoutMutation.mutateAsync({
      project_id: selectedProjectId,
      name: name.trim(),
      color,
    })

    const layoutId = result.data.id

    // Assign roles (empty = public)
    for (const roleId of selectedRoleIds) {
      await addRoleLayoutMutation.mutateAsync({
        role_id: roleId,
        layout_id: layoutId,
      })
    }

    setSelectedModuleId(String(layoutId))
    setName('')
    setSelectedRoleIds([])
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
    roles,
    selectedRoleIds,
    toggleRole,
    handleSubmit,
    isCreating: createLayoutMutation.isPending,
  }
}
