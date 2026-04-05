import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createProjectApi,
  deleteProjectApi,
  userProjectsQueryApi,
} from './user-project.api'

import { EUserProjectKey } from '../interface'

const userProjectsQueryOptions = () => {
  return queryOptions({
    queryKey: [EUserProjectKey.USER_PROJECTS_QUERY],
    queryFn: (opt) => userProjectsQueryApi(opt),
  })
}

export const useUserProjectsQuery = () => {
  return useQuery(userProjectsQueryOptions())
}

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createProjectApi(name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EUserProjectKey.USER_PROJECTS_QUERY],
      })
    },
  })
}

export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => deleteProjectApi(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EUserProjectKey.USER_PROJECTS_QUERY],
      })
    },
  })
}
