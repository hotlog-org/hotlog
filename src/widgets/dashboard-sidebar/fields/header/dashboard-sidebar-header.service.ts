'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { useUserProjectsQuery } from '@/shared/api'
import type { IUserProjectDto } from '@/shared/api/interface'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'

export const useDashboardSidebarHeaderService = () => {
  const t = useTranslations('modules.dashboard.sidebar.projects')
  const { data } = useUserProjectsQuery()
  const selectedProjectId = useDashboardProject(
    (state) => state.selectedProjectId,
  )
  const handleDashboardProject = useDashboardProject(
    (state) => state.handleDashboardProject,
  )
  const [projects, setProjects] = useState<IUserProjectDto[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    setProjects(data?.data ?? [])
  }, [data])

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

  const handleCreateProject = (name: string) => {
    const nextProject: IUserProjectDto = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      isCreator: true,
    }

    setProjects((prev) => [...prev, nextProject])
    handleDashboardProject({ selectedProjectId: nextProject.id })

    return nextProject
  }

  const setSelectedProject = (project: IUserProjectDto) => {
    handleDashboardProject({ selectedProjectId: project.id })
  }

  return {
    t,
    projects,
    selectedProject,
    setSelectedProject,
    createDialogOpen,
    setCreateDialogOpen,
    handleCreateProject,
  }
}
