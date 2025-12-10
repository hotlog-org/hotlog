'use client'
import { useState } from 'react'
import { useCreateProjectService } from './create-project.service'
import { Project } from './create-project.interface'

export const createProjectComponent = (initialProjects: Project[]) => {
  const { createProject } = useCreateProjectService()

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
