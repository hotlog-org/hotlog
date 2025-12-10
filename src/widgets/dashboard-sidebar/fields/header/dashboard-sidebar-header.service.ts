'use client'

import { useTranslations } from 'next-intl'
import {
  Rocket02Icon,
  TestTube02Icon,
  ThreeDRotateIcon,
} from '@hugeicons/core-free-icons'
import { createProjectComponent } from '@/modules/create-project/create-project.component'
import { Project } from '@/modules/create-project/create-project.service'
import { useState } from 'react'

const initialProjects: Project[] = [
  { id: '1', name: 'HotLog', icon: Rocket02Icon, color: '#3b82f6' },
  { id: '2', name: 'Noir Inc.', icon: TestTube02Icon, color: '#8b5cf6' },
  {
    id: '3',
    name: 'Polytechnic Labs',
    icon: ThreeDRotateIcon,
    color: '#10b981',
  },
]

export const useDashboardSidebarHeaderService = () => {
  const t = useTranslations('modules.dashboard.sidebar.projects')

  const projectManager = createProjectComponent(initialProjects)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  return {
    t,
    projects: projectManager.projects,
    selectedProject: projectManager.selectedProject,
    setSelectedProject: projectManager.setSelectedProject,
    createDialogOpen,
    setCreateDialogOpen,
    handleCreateProject: projectManager.handleCreateProject,
  }
}
