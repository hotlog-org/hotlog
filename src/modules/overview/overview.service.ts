'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useUserPermissions } from '@/shared/api/user-permission'
import {
  useProjectRolesQuery,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useAddRolePermissionMutation,
  useRemoveRolePermissionMutation,
} from '@/shared/api/project-role'
import {
  useProjectMembersQuery,
  useRemoveMemberMutation,
} from '@/shared/api/project-member'
import { useProjectPermissionsQuery } from '@/shared/api/project-permission'

import {
  buildApiRequestsSeries,
  overviewApiKeyMock,
  permissionCategoryStyles,
} from './mock-data'
import type {
  ApiRequestSeriesPoint,
  OverviewPermission,
  OverviewRole,
  OverviewTab,
  OverviewUser,
  PermissionCategory,
  RoleOption,
} from './overview.interface'

export type TFunction = ReturnType<typeof useTranslations>

export interface OverviewService {
  t: TFunction
  tab: OverviewTab
  setTab: (tab: OverviewTab) => void
  apiRequests: ApiRequestSeriesPoint[]
  apiKey: string
  regenerateApiKey: () => string
  users: OverviewUser[]
  filteredUsers: OverviewUser[]
  roles: OverviewRole[]
  filteredRoles: OverviewRole[]
  permissions: OverviewPermission[]
  permissionColors: Record<PermissionCategory | string, string>
  roleOptions: RoleOption[]
  userSearch: string
  setUserSearch: (value: string) => void
  roleSearch: string
  setRoleSearch: (value: string) => void
  updateUserRole: (userId: string, roleId: string) => void
  removeUser: (userId: string) => void
  revokeInvite: (userId: string) => void
  inviteModalOpen: boolean
  openInviteModal: () => void
  closeInviteModal: () => void
  inviteMember: (email: string) => void
  addRoleModalOpen: boolean
  openAddRoleModal: () => void
  closeAddRoleModal: () => void
  addRole: (payload: { name: string; permissionIds: string[] }) => void
  deleteRole: (roleId: string) => void
  addPermissionToRole: (roleId: string, permissionId: string) => void
  removePermissionFromRole: (roleId: string, permissionId: string) => void
  canReadUsers: boolean
  canCreateUsers: boolean
  canDeleteUsers: boolean
  canReadRoles: boolean
  canCreateRoles: boolean
  canUpdateRoles: boolean
  canDeleteRoles: boolean
  isLoading: boolean
  hasNoProject: boolean
}

const useOverviewService = (): OverviewService => {
  const t = useTranslations('modules.dashboard.overview')

  const selectedProjectId = useDashboardProject((s) => s.selectedProjectId)
  const { can } = useUserPermissions(selectedProjectId)

  // Permission checks
  const canReadUsers = can('read:users')
  const canCreateUsers = can('create:users')
  const canDeleteUsers = can('delete:users')
  const canReadRoles = can('read:roles')
  const canCreateRoles = can('create:roles')
  const canUpdateRoles = can('update:roles')
  const canDeleteRoles = can('delete:roles')

  // Data queries
  const rolesQuery = useProjectRolesQuery(
    canReadRoles ? selectedProjectId : undefined,
  )
  const membersQuery = useProjectMembersQuery(
    canReadUsers ? selectedProjectId : undefined,
  )
  const permissionsQuery = useProjectPermissionsQuery()

  // Mutations
  const createRoleMutation = useCreateRoleMutation(selectedProjectId)
  const deleteRoleMutation = useDeleteRoleMutation(selectedProjectId)
  const addRolePermissionMutation =
    useAddRolePermissionMutation(selectedProjectId)
  const removeRolePermissionMutation =
    useRemoveRolePermissionMutation(selectedProjectId)
  const removeMemberMutation = useRemoveMemberMutation(selectedProjectId)

  const [tab, setTab] = useState<OverviewTab>('users')
  const [apiKey, setApiKey] = useState(overviewApiKeyMock)
  const [userSearch, setUserSearch] = useState('')
  const [roleSearch, setRoleSearch] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false)

  const apiRequests = useMemo(() => buildApiRequestsSeries(), [])

  const isLoading =
    rolesQuery.isLoading || membersQuery.isLoading || permissionsQuery.isLoading

  // Map DB permissions to OverviewPermission format
  const permissions: OverviewPermission[] = useMemo(() => {
    const dbPermissions = permissionsQuery.data?.data ?? []
    return dbPermissions.map((p) => ({
      id: p.id,
      category: p.subject as PermissionCategory,
      label: p.action,
    }))
  }, [permissionsQuery.data])

  // Map DB roles to OverviewRole format
  const roles: OverviewRole[] = useMemo(() => {
    const dbRoles = rolesQuery.data?.data ?? []
    return dbRoles.map((role) => ({
      id: role.id,
      name: role.name,
      permissionIds: role.permissions.map((p) => p.id),
    }))
  }, [rolesQuery.data])

  // Map DB members to OverviewUser format
  const users: OverviewUser[] = useMemo(() => {
    const dbMembers = membersQuery.data?.data ?? []
    return dbMembers.map((member) => ({
      id: member.id,
      email: member.email,
      roleId: member.roleId ?? '',
      status: 'active' as const,
    }))
  }, [membersQuery.data])

  const roleOptions = useMemo<RoleOption[]>(
    () => roles.map((role) => ({ label: role.name, value: role.id })),
    [roles],
  )

  const permissionLookup = useMemo(
    () =>
      permissions.reduce<Record<string, OverviewPermission>>(
        (map, permission) => {
          map[permission.id] = permission
          return map
        },
        {},
      ),
    [permissions],
  )

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const normalized = userSearch.trim().toLowerCase()

    return users.filter((user) => {
      const role = roles.find((item) => item.id === user.roleId)
      return (
        user.email.toLowerCase().includes(normalized) ||
        role?.name.toLowerCase().includes(normalized)
      )
    })
  }, [roles, userSearch, users])

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles
    const normalized = roleSearch.trim().toLowerCase()

    return roles.filter((role) => {
      const matchesName = role.name.toLowerCase().includes(normalized)
      const matchesPermissions = role.permissionIds.some((id) => {
        const permission = permissionLookup[id]
        return (
          permission?.label.toLowerCase().includes(normalized) ||
          permission?.category.toLowerCase().includes(normalized)
        )
      })

      return matchesName || matchesPermissions
    })
  }, [roleSearch, roles, permissionLookup])

  const regenerateApiKey = useCallback(() => {
    const suffix = Math.random().toString(36).slice(2, 10)
    const nextKey = `hl_sk_${suffix}_generated`
    setApiKey(nextKey)
    return nextKey
  }, [])

  const updateUserRole = useCallback((_userId: string, _roleId: string) => {
    // TODO: implement update user role mutation
  }, [])

  const removeUser = useCallback(
    (userId: string) => {
      if (!selectedProjectId) return
      removeMemberMutation.mutate({
        project_id: selectedProjectId,
        user_id: userId,
      })
    },
    [removeMemberMutation, selectedProjectId],
  )

  const revokeInvite = useCallback(
    (userId: string) => {
      removeUser(userId)
    },
    [removeUser],
  )

  const inviteMember = useCallback((_email: string) => {
    // TODO: implement invite member flow
  }, [])

  const addRole = useCallback(
    (payload: { name: string; permissionIds: string[] }) => {
      if (!selectedProjectId) return
      createRoleMutation.mutate({
        project_id: selectedProjectId,
        name: payload.name.trim(),
        permission_ids: payload.permissionIds,
      })
    },
    [createRoleMutation, selectedProjectId],
  )

  const deleteRole = useCallback(
    (roleId: string) => {
      deleteRoleMutation.mutate(roleId)
    },
    [deleteRoleMutation],
  )

  const addPermissionToRole = useCallback(
    (roleId: string, permissionId: string) => {
      addRolePermissionMutation.mutate({
        role_id: roleId,
        permission_id: permissionId,
      })
    },
    [addRolePermissionMutation],
  )

  const removePermissionFromRole = useCallback(
    (roleId: string, permissionId: string) => {
      removeRolePermissionMutation.mutate({
        role_id: roleId,
        permission_id: permissionId,
      })
    },
    [removeRolePermissionMutation],
  )

  return {
    t,
    tab,
    setTab,
    apiRequests,
    apiKey,
    regenerateApiKey,
    users,
    filteredUsers,
    roles,
    filteredRoles,
    permissions,
    permissionColors: permissionCategoryStyles,
    roleOptions,
    userSearch,
    setUserSearch,
    roleSearch,
    setRoleSearch,
    updateUserRole,
    removeUser,
    revokeInvite,
    inviteModalOpen,
    openInviteModal: () => setInviteModalOpen(true),
    closeInviteModal: () => setInviteModalOpen(false),
    inviteMember,
    addRoleModalOpen,
    openAddRoleModal: () => setAddRoleModalOpen(true),
    closeAddRoleModal: () => setAddRoleModalOpen(false),
    addRole,
    deleteRole,
    addPermissionToRole,
    removePermissionFromRole,
    canReadUsers,
    canCreateUsers,
    canDeleteUsers,
    canReadRoles,
    canCreateRoles,
    canUpdateRoles,
    canDeleteRoles,
    isLoading,
    hasNoProject: !selectedProjectId,
  }
}

export { useOverviewService }
export default useOverviewService
