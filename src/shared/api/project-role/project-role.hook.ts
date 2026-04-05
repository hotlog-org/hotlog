import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type ICreateRolePayload,
  type IRolePermissionPayload,
  EProjectRoleKey,
} from '../interface'

import {
  addRolePermissionApi,
  createRoleApi,
  deleteRoleApi,
  projectRolesQueryApi,
  removeRolePermissionApi,
} from './project-role.api'

export const useProjectRolesQuery = (projectId?: string) => {
  return useQuery({
    queryKey: [EProjectRoleKey.PROJECT_ROLES_QUERY, projectId],
    queryFn: (opt) => projectRolesQueryApi(projectId ?? '', opt),
    enabled: Boolean(projectId),
  })
}

export const useCreateRoleMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ICreateRolePayload) => createRoleApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EProjectRoleKey.PROJECT_ROLES_QUERY, projectId],
      })
    },
  })
}

export const useDeleteRoleMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleId: string) => deleteRoleApi(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EProjectRoleKey.PROJECT_ROLES_QUERY, projectId],
      })
    },
  })
}

export const useAddRolePermissionMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IRolePermissionPayload) =>
      addRolePermissionApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EProjectRoleKey.PROJECT_ROLES_QUERY, projectId],
      })
    },
  })
}

export const useRemoveRolePermissionMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IRolePermissionPayload) =>
      removeRolePermissionApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EProjectRoleKey.PROJECT_ROLES_QUERY, projectId],
      })
    },
  })
}
