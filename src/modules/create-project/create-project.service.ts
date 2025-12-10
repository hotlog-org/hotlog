'use client'

import { Rocket02Icon } from '@hugeicons/core-free-icons'
import { IconSvgElement } from '@hugeicons/react'

export interface Project {
  id: string
  name: string
  icon: IconSvgElement
  color: string
}

export const useProjectManagerService = () => {
  const createProject = (projects: Project[], name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      icon: Rocket02Icon,
      color: '#3b82f6',
    }
    return [...projects, newProject]
  }

  return { createProject }
}
