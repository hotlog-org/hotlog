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
  queryKey: ReturnType<typeof rolesKey>
  optimisticId?: string
  permissionAdded?: boolean
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
      const queryKey = rolesKey(payload.project_id)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(queryKey)

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

      queryClient.setQueryData<IProjectRolesResponse>(queryKey, (old) => ({
        data: [...(old?.data ?? []), optimisticRole],
      }))

      return {
        queryKey,
        previous,
        hadPrevious: previous !== undefined,
        optimisticId: optimisticRole.id,
      }
    },
    onError: (_err, _variables, context) => {
      if (!context) return
      queryClient.setQueryData<IProjectRolesResponse>(
        context.queryKey,
        (current) =>
          current && {
            ...current,
            data: current.data.filter(
              (role) => role.id !== context.optimisticId,
            ),
          },
      )
      if (
        !context.hadPrevious &&
        !queryClient.getQueryData<IProjectRolesResponse>(context.queryKey)?.data
          .length
      ) {
        queryClient.removeQueries({ queryKey: context.queryKey })
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return
      queryClient.invalidateQueries({ queryKey: context.queryKey })
    },
  })
}

export const useDeleteRoleMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (roleId: string) => deleteRoleApi(roleId),
    onMutate: async (roleId): Promise<MutationContext> => {
      const queryKey = rolesKey(projectId)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(queryKey)

      queryClient.setQueryData<IProjectRolesResponse>(queryKey, (old) => ({
        data: (old?.data ?? []).filter((role) => role.id !== roleId),
      }))

      return { queryKey, previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, roleId, context) => {
      if (!context) return
      // Undo only this deletion; a full snapshot resurrects other pending or
      // successful deletions even though mutation requests share a scope.
      if (context.hadPrevious) {
        const removed = context.previous?.data.find(
          (item) => item.id === roleId,
        )
        if (!removed) return
        queryClient.setQueryData<IProjectRolesResponse>(
          context.queryKey,
          (current) => {
            const data = [...(current?.data ?? [])]
            if (!data.some((item) => item.id === roleId)) {
              const index = context.previous!.data.findIndex(
                (item) => item.id === roleId,
              )
              data.splice(Math.min(index, data.length), 0, removed)
            }
            return { ...current, data }
          },
        )
      } else if (
        !queryClient.getQueryData<IProjectRolesResponse>(context.queryKey)?.data
          .length
      ) {
        queryClient.removeQueries({ queryKey: context.queryKey })
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return
      queryClient.invalidateQueries({ queryKey: context.queryKey })
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
      const queryKey = rolesKey(projectId)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(queryKey)

      const permissionsCatalog =
        queryClient.getQueryData<IProjectPermissionsResponse>([
          EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY,
        ])

      const permission = (permissionsCatalog?.data ?? []).find(
        (p) => p.id === payload.permission_id,
      )

      if (!permission) {
        return { queryKey, previous, hadPrevious: previous !== undefined }
      }

      queryClient.setQueryData<IProjectRolesResponse>(queryKey, (old) => ({
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
      }))

      return {
        queryKey,
        previous,
        hadPrevious: previous !== undefined,
        permissionAdded: previous?.data.some(
          (role) =>
            role.id === payload.role_id &&
            !role.permissions.some((item) => item.id === payload.permission_id),
        ),
      }
    },
    onError: (_err, payload, context) => {
      if (!context) return
      queryClient.setQueryData<IProjectRolesResponse>(
        context.queryKey,
        (current) =>
          current && {
            ...current,
            data: current.data.map((role) => {
              if (role.id !== payload.role_id || !context.permissionAdded)
                return role
              return {
                ...role,
                permissions: role.permissions.filter(
                  (permission) => permission.id !== payload.permission_id,
                ),
              }
            }),
          },
      )
      if (
        !context.hadPrevious &&
        !queryClient.getQueryData<IProjectRolesResponse>(context.queryKey)?.data
          .length
      ) {
        queryClient.removeQueries({ queryKey: context.queryKey })
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return
      queryClient.invalidateQueries({ queryKey: context.queryKey })
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
      const queryKey = rolesKey(projectId)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<IProjectRolesResponse>(queryKey)

      queryClient.setQueryData<IProjectRolesResponse>(queryKey, (old) => ({
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
      }))

      return { queryKey, previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, payload, context) => {
      if (!context) return
      const previousPermission = context.previous?.data
        .find((role) => role.id === payload.role_id)
        ?.permissions.find(
          (permission) => permission.id === payload.permission_id,
        )
      queryClient.setQueryData<IProjectRolesResponse>(
        context.queryKey,
        (current) =>
          current && {
            ...current,
            data: current.data.map((role) => {
              if (role.id !== payload.role_id) return role
              if (
                !previousPermission ||
                role.permissions.some(
                  (permission) => permission.id === payload.permission_id,
                )
              )
                return role
              const permissions = [...role.permissions]
              const index =
                context.previous?.data
                  .find((item) => item.id === payload.role_id)
                  ?.permissions.findIndex(
                    (item) => item.id === payload.permission_id,
                  ) ?? permissions.length
              permissions.splice(
                Math.min(index, permissions.length),
                0,
                previousPermission,
              )
              return { ...role, permissions }
            }),
          },
      )
      if (
        !context.hadPrevious &&
        !queryClient.getQueryData<IProjectRolesResponse>(context.queryKey)?.data
          .length
      ) {
        queryClient.removeQueries({ queryKey: context.queryKey })
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return
      queryClient.invalidateQueries({ queryKey: context.queryKey })
    },
  })
}
