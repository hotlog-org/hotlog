'use client'

import { useRef, useState } from 'react'
import { HTTPError } from 'ky'
import { useQueryClient } from '@tanstack/react-query'

import { layoutsQueryApi } from '@/shared/api/layout/layout.api'
import { ELayoutKey } from '@/shared/api/interface'
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
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [creationUncertain, setCreationUncertain] = useState(false)
  const pending = useRef<{
    projectId: string
    layoutId: number
    roleIds: string[]
    completed: Set<string>
    uncertain: boolean
  } | null>(null)
  const busy = useRef(false)
  const queryClient = useQueryClient()
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
    if (!name.trim() || !selectedProjectId || busy.current || creationUncertain)
      return
    if (pending.current && pending.current.projectId !== selectedProjectId) {
      setError(
        'Return to the original project to finish assigning module visibility.',
      )
      return
    }
    busy.current = true
    setIsCreating(true)
    setError(null)
    try {
      if (!pending.current) {
        const result = await createLayoutMutation.mutateAsync({
          project_id: selectedProjectId,
          name: name.trim(),
          color,
        })
        pending.current = {
          projectId: selectedProjectId,
          layoutId: result.data.id,
          roleIds: [...selectedRoleIds],
          completed: new Set(),
          uncertain: false,
        }
      }
      const operation = pending.current
      const checkProject = () => {
        if (
          useDashboardProject.getState().selectedProjectId !==
          operation.projectId
        ) {
          throw new Error(
            'Return to the original project to finish assigning module visibility.',
          )
        }
      }
      checkProject()
      if (operation.uncertain) {
        // A lost response may have committed. Read before retrying the insert.
        const result = await queryClient.fetchQuery({
          queryKey: [ELayoutKey.LAYOUTS_QUERY, operation.projectId],
          queryFn: (opt) => layoutsQueryApi(operation.projectId, opt),
          staleTime: 0,
        })
        const layout = result.data.find(
          (item) => item.id === operation.layoutId,
        )
        if (!layout)
          throw new Error(
            'Unable to confirm module visibility. Review the module before retrying.',
          )
        operation.completed = new Set(layout.roleIds)
        operation.uncertain = false
      }
      for (const roleId of operation.roleIds) {
        checkProject()
        if (operation.completed.has(roleId)) continue
        operation.uncertain = true
        await addRoleLayoutMutation.mutateAsync({
          role_id: roleId,
          layout_id: operation.layoutId,
        })
        operation.completed.add(roleId)
        operation.uncertain = false
      }
      checkProject()
      setSelectedModuleId(String(operation.layoutId))
      pending.current = null
      setName('')
      setSelectedRoleIds([])
      setOpen(false)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Failed to create module'
      if (pending.current) {
        setError(
          `Module was created, but visibility setup is incomplete. It may be public. ${message}`,
        )
      } else if (
        !(cause instanceof HTTPError) ||
        cause.response.status >= 500
      ) {
        setCreationUncertain(true)
        setError(
          `Creation could not be confirmed. Review the project before creating another module. ${message}`,
        )
      } else {
        setError(message)
      }
    } finally {
      busy.current = false
      setIsCreating(false)
    }
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
    isCreating,
    error:
      pending.current && pending.current.projectId !== selectedProjectId
        ? 'Return to the original project to finish assigning module visibility. The module was already created and may be public.'
        : error,
    draftLocked: isCreating || Boolean(pending.current) || creationUncertain,
    submitBlocked:
      creationUncertain ||
      Boolean(
        pending.current && pending.current.projectId !== selectedProjectId,
      ),
  }
}
