import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type ICreateRolePayload,
  type IProjectRoleDto,
  type IProjectRolesResponse,
  type IProjectPermissionsResponse,
  type IRolePermissionPayload,
  EProjectPermissionKey,
  EProjectRoleKey,
} from '../interface'

import {
  addRolePermissionApi,
  createRoleApi,
  deleteRoleApi,
  projectRolesQueryApi,
  removeRolePermissionApi,
} from './project-role.api'

const rolesKey = (projectId?: string) => [
  EProjectRoleKey.PROJECT_ROLES_QUERY,
  projectId,
]

const mutationScope = (projectId?: string) => ({
  id: `project-roles-${projectId ?? 'none'}`,
})

export const OPTIMISTIC_ID_PREFIX = '__optimistic_'

export const isOptimisticId = (id: string) =>
  id.startsWith(OPTIMISTIC_ID_PREFIX)

const generateOptimisticId = () =>
  `${OPTIMISTIC_ID_PREFIX}${
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`
  }`

interface MutationContext {
  previous: IProjectRolesResponse | undefined
  hadPrevious: boolean
}

export const useProjectRolesQuery = (projectId?: string) => {
  return useQuery({
    queryKey: rolesKey(projectId),
    queryFn: (opt) => projectRolesQueryApi(projectId ?? '', opt),
    enabled: Boolean(projectId),
  })
}

export const useCreateRoleMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (payload: ICreateRolePayload) => createRoleApi(payload),
    onMutate: async (payload): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: rolesKey(projectId) })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
      )

      const permissionsCatalog =
        queryClient.getQueryData<IProjectPermissionsResponse>([
          EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY,
        ])

      const selectedPermissions = (permissionsCatalog?.data ?? []).filter((p) =>
        payload.permission_ids.includes(p.id),
      )

      const optimisticRole: IProjectRoleDto = {
        id: generateOptimisticId(),
        name: payload.name.trim(),
        createdAt: new Date().toISOString(),
        permissions: selectedPermissions,
      }

      queryClient.setQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
        (old) => ({
          data: [...(old?.data ?? []), optimisticRole],
        }),
      )

      return { previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, _variables, context) => {
      if (!context) return
      if (context.hadPrevious) {
        queryClient.setQueryData(rolesKey(projectId), context.previous)
      } else {
        queryClient.removeQueries({ queryKey: rolesKey(projectId) })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rolesKey(projectId) })
    },
  })
}

export const useDeleteRoleMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (roleId: string) => deleteRoleApi(roleId),
    onMutate: async (roleId): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: rolesKey(projectId) })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
      )

      queryClient.setQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
        (old) => ({
          data: (old?.data ?? []).filter((role) => role.id !== roleId),
        }),
      )

      return { previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, _roleId, context) => {
      if (!context) return
      if (context.hadPrevious) {
        queryClient.setQueryData(rolesKey(projectId), context.previous)
      } else {
        queryClient.removeQueries({ queryKey: rolesKey(projectId) })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rolesKey(projectId) })
    },
  })
}

export const useAddRolePermissionMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (payload: IRolePermissionPayload) =>
      addRolePermissionApi(payload),
    onMutate: async (payload): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: rolesKey(projectId) })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
      )

      const permissionsCatalog =
        queryClient.getQueryData<IProjectPermissionsResponse>([
          EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY,
        ])

      const permission = (permissionsCatalog?.data ?? []).find(
        (p) => p.id === payload.permission_id,
      )

      if (!permission) {
        return { previous, hadPrevious: previous !== undefined }
      }

      queryClient.setQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
        (old) => ({
          data: (old?.data ?? []).map((role) =>
            role.id === payload.role_id
              ? {
                  ...role,
                  permissions: role.permissions.some(
                    (p) => p.id === permission.id,
                  )
                    ? role.permissions
                    : [...role.permissions, permission],
                }
              : role,
          ),
        }),
      )

      return { previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, _variables, context) => {
      if (!context) return
      if (context.hadPrevious) {
        queryClient.setQueryData(rolesKey(projectId), context.previous)
      } else {
        queryClient.removeQueries({ queryKey: rolesKey(projectId) })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rolesKey(projectId) })
    },
  })
}

export const useRemoveRolePermissionMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (payload: IRolePermissionPayload) =>
      removeRolePermissionApi(payload),
    onMutate: async (payload): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: rolesKey(projectId) })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
      )

      queryClient.setQueryData<IProjectRolesResponse>(
        rolesKey(projectId),
        (old) => ({
          data: (old?.data ?? []).map((role) =>
            role.id === payload.role_id
              ? {
                  ...role,
                  permissions: role.permissions.filter(
                    (p) => p.id !== payload.permission_id,
                  ),
                }
              : role,
          ),
        }),
      )

      return { previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, _variables, context) => {
      if (!context) return
      if (context.hadPrevious) {
        queryClient.setQueryData(rolesKey(projectId), context.previous)
      } else {
        queryClient.removeQueries({ queryKey: rolesKey(projectId) })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rolesKey(projectId) })
    },
  })
}
