'use client'
import { useState } from 'react'
import { Project, useProjectManagerService } from './create-project.service'

export const useProjectManager = (initialProjects: Project[]) => {
  const { createProject } = useProjectManagerService()

  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedProject, setSelectedProject] = useState<Project>(
    initialProjects[0] || null,
  )

  const handleCreateProject = (name: string) => {
    const updated = createProject(projects, name)
    setProjects(updated)
    setSelectedProject(updated[updated.length - 1])
    return updated[updated.length - 1]
  }

  return {
    projects,
    selectedProject,
    setSelectedProject,
    handleCreateProject,
  }
}
