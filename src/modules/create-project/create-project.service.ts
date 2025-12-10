'use client'

import { Rocket02Icon } from '@hugeicons/core-free-icons'
import { Project } from './create-project.interface'

export const useCreateProjectService = () => {
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
