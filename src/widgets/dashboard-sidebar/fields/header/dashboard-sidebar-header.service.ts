'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { useCreateProjectMutation, useUserProjectsQuery } from '@/shared/api'
import type { IUserProjectDto } from '@/shared/api/interface'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'

export const useDashboardSidebarHeaderService = () => {
  const t = useTranslations('modules.dashboard.sidebar.projects')
  const { data } = useUserProjectsQuery()
  const createProjectMutation = useCreateProjectMutation()
  const selectedProjectId = useDashboardProject(
    (state) => state.selectedProjectId,
  )
  const handleDashboardProject = useDashboardProject(
    (state) => state.handleDashboardProject,
  )
  const projects = useMemo(() => data?.data ?? [], [data])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (!projects.length) {
      handleDashboardProject({ selectedProjectId: undefined })
      return
    }

    const hasSelectedProject = projects.some(
      (project) => project.id === selectedProjectId,
    )

    if (!hasSelectedProject) {
      handleDashboardProject({ selectedProjectId: projects[0].id })
    }
  }, [handleDashboardProject, projects, selectedProjectId])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const handleCreateProject = async (name: string): Promise<boolean> => {
    if (!name.trim() || createProjectMutation.isPending) return false
    try {
      const response = await createProjectMutation.mutateAsync(name.trim())
      const created = response.data[0]
      if (created) handleDashboardProject({ selectedProjectId: created.id })
      setCreateDialogOpen(false)
      return true
    } catch {
      // Mutation state supplies the inline error; keep the dialog and draft.
      return false
    }
  }

  const setSelectedProject = (project: IUserProjectDto) => {
    handleDashboardProject({ selectedProjectId: project.id })
  }

  return {
    t,
    projects,
    selectedProject,
    selectedProjectId,
    setSelectedProject,
    createDialogOpen,
    setCreateDialogOpen,
    handleCreateProject,
    createError: createProjectMutation.error?.message,
    isCreating: createProjectMutation.isPending,
  }
}
