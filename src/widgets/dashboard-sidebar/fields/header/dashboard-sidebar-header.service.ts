'use client'

import {
  Rocket02Icon,
  TestTube02Icon,
  ThreeDRotateIcon
} from '@hugeicons/core-free-icons'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export const useDashboardSidebarHeaderService = () => {
  const t = useTranslations('modules.dashboard.sidebar.projects')

  const projects = [
    {
      id: '1',
      name: 'HotLog',
      icon: Rocket02Icon,
      color: '#3b82f6',
    },
    {
      id: '2',
      name: 'Noir Inc.',
      icon: TestTube02Icon,
      color: '#8b5cf6',
    },
    {
      id: '3',
      name: 'Polytechnic Labs',
      icon: ThreeDRotateIcon,
      color: '#10b981',
    },
  ]

  const [selectedProject, setSelectedProject] = useState(projects[0])

  return {
    t,
    projects,
    selectedProject,
    setSelectedProject,
  }
}
