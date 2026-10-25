'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useAuth } from '@/shared/hooks/use-auth'
import { useUserPermissions } from '@/shared/api/user-permission'
import {
  useDeleteProjectMutation,
  useUserProjectsQuery,
} from '@/shared/api/user-project'
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
  useUpdateMemberRoleMutation,
} from '@/shared/api/project-member'
import {
  useInvitationsQuery,
  useCreateInvitationMutation,
  useRevokeInvitationMutation,
} from '@/shared/api/invitation'
import { useProjectPermissionsQuery } from '@/shared/api/project-permission'
import {
  useCreateApiKeyMutation,
  useRotateApiKeyMutation,
  useDeleteApiKeyMutation,
  useProjectApiKeysQuery,
} from '@/shared/api/project-api-key'
import type {
  IProjectApiKeyDto,
  IProjectApiKeyResponse,
} from '@/shared/api/interface'
import { useEventStatsQuery } from '@/shared/api/event'

import { permissionCategoryStyles } from './mock-data'
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
  actionError: string | null
  inviteError?: string
  addRoleError?: string
  deleteProjectError?: string
  isAddingRole: boolean
  tab: OverviewTab
  setTab: (tab: OverviewTab) => void
  apiRequests: ApiRequestSeriesPoint[]
  apiRequestsLoading: boolean
  apiKey: string | null
  apiKeys: IProjectApiKeyDto[]
  selectedApiKeyId: number | null
  selectApiKey: (id: number | null) => void
  dismissApiKey: () => void
  revokeApiKey: () => void
  apiKeyError: string | null
  apiKeyLoading: boolean
  canReadApiKey: boolean
  canCreateApiKey: boolean
  canDeleteApiKey: boolean
  createApiKey: () => void
  regenerateApiKey: () => void
  isRegeneratingApiKey: boolean
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
  inviteMember: (email: string, roleId?: string) => void
  isInviting: boolean
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
  canDeleteProject: boolean
  currentUserId: string
  isLoading: boolean
  loadError: string | null
  statsError: string | null
  hasNoProject: boolean
  projectName: string
  deleteProjectModalOpen: boolean
  openDeleteProjectModal: () => void
  closeDeleteProjectModal: () => void
  deleteProject: () => void
  isDeletingProject: boolean
}

const useOverviewService = (): OverviewService => {
  const t = useTranslations('modules.dashboard.overview')

  const selectedProjectId = useDashboardProject((s) => s.selectedProjectId)
  const {
    can,
    isPending: permissionsPending,
    isPlaceholderData: permissionsPlaceholder,
  } = useUserPermissions(selectedProjectId)
  const { user: authUser } = useAuth()
  const currentUserId = authUser?.id ?? ''

  // Permission checks
  const canReadUsers = can('read:users')
  const canCreateUsers = can('create:users')
  const canDeleteUsers = can('delete:users')
  const canReadRoles = can('read:roles')
  const canCreateRoles = can('create:roles')
  const canUpdateRoles = can('update:roles')
  const canDeleteRoles = can('delete:roles')
  const canDeleteProject = can('delete:projects')
  const canReadApiKey = can('read:api_keys')
  const canCreateApiKey = can('create:api_keys')
  const canDeleteApiKey = can('delete:api_keys')

  // Data queries
  const rolesQuery = useProjectRolesQuery(
    canReadRoles ? selectedProjectId : undefined,
  )
  const membersQuery = useProjectMembersQuery(
    canReadUsers ? selectedProjectId : undefined,
  )
  const permissionsQuery = useProjectPermissionsQuery()
  const apiKeysQuery = useProjectApiKeysQuery(
    canReadApiKey ? selectedProjectId : undefined,
  )

  // Invitation query
  const invitationsQuery = useInvitationsQuery(
    canReadUsers ? selectedProjectId : undefined,
  )

  // Mutations
  const createRoleMutation = useCreateRoleMutation(selectedProjectId)
  const deleteRoleMutation = useDeleteRoleMutation(selectedProjectId)
  const addRolePermissionMutation =
    useAddRolePermissionMutation(selectedProjectId)
  const removeRolePermissionMutation =
    useRemoveRolePermissionMutation(selectedProjectId)
  const removeMemberMutation = useRemoveMemberMutation(selectedProjectId)
  const updateMemberRoleMutation =
    useUpdateMemberRoleMutation(selectedProjectId)
  const createInvitationMutation =
    useCreateInvitationMutation(selectedProjectId)
  const revokeInvitationMutation =
    useRevokeInvitationMutation(selectedProjectId)
  const deleteProjectMutation = useDeleteProjectMutation()
  const [oneTimeKey, setOneTimeKey] = useState<
    IProjectApiKeyResponse['data'] | null
  >(null)
  const [keySelection, setKeySelection] = useState<{
    projectId?: string
    id: number | null
  }>({ id: null })
  const [keyError, setKeyError] = useState<string | null>(null)
  const keyBusy = useRef(false)
  const projectRef = useRef(selectedProjectId)
  projectRef.current = selectedProjectId
  const keyGeneration = useRef(0)
  useEffect(() => {
    keyGeneration.current += 1
    setOneTimeKey(null)
    setKeyError(null)
    setKeySelection({ projectId: selectedProjectId, id: null })
  }, [selectedProjectId])
  useEffect(
    () => () => {
      keyGeneration.current += 1
    },
    [],
  )
  const receiveSecret = (value: IProjectApiKeyResponse['data']) => {
    if (projectRef.current !== value.project_id) return
    setOneTimeKey(value)
    setKeySelection({ projectId: value.project_id, id: value.id })
  }
  const secretReceiver = useRef(receiveSecret)
  secretReceiver.current = receiveSecret
  // Capture the lifecycle at dispatch, not in the cached mutation result.
  const activeGeneration = useRef(0)
  const acceptSecret = (value: IProjectApiKeyResponse['data']) => {
    if (activeGeneration.current === keyGeneration.current)
      secretReceiver.current(value)
  }
  const createApiKeyMutation = useCreateApiKeyMutation(
    selectedProjectId,
    acceptSecret,
  )
  const rotateApiKeyMutation = useRotateApiKeyMutation(
    selectedProjectId,
    acceptSecret,
  )
  const deleteApiKeyMutation = useDeleteApiKeyMutation(selectedProjectId)

  const projectsQuery = useUserProjectsQuery()
  const projectName = useMemo(() => {
    const project = projectsQuery.data?.data.find(
      (p) => p.id === selectedProjectId,
    )
    return project?.name ?? ''
  }, [projectsQuery.data, selectedProjectId])

  const handleDashboardProject = useDashboardProject(
    (s) => s.handleDashboardProject,
  )

  const [tab, setTab] = useState<OverviewTab>('users')
  const [userSearch, setUserSearch] = useState('')
  const [roleSearch, setRoleSearch] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false)
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false)

  const eventStatsQuery = useEventStatsQuery(selectedProjectId, 30)
  const apiRequests: ApiRequestSeriesPoint[] = useMemo(() => {
    const data = eventStatsQuery.isPlaceholderData
      ? []
      : (eventStatsQuery.data?.data ?? [])
    return data.map((row) => ({
      date: new Date(row.day),
      value: row.count,
      category: 'Events',
    }))
  }, [eventStatsQuery.data, eventStatsQuery.isPlaceholderData])

  const isLoading =
    (Boolean(selectedProjectId) &&
      (permissionsPending || permissionsPlaceholder)) ||
    (canReadRoles && (rolesQuery.isLoading || rolesQuery.isPlaceholderData)) ||
    (canReadUsers &&
      (membersQuery.isLoading ||
        membersQuery.isPlaceholderData ||
        invitationsQuery.isPlaceholderData)) ||
    permissionsQuery.isLoading

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
    const dbRoles = rolesQuery.isPlaceholderData
      ? []
      : (rolesQuery.data?.data ?? [])
    return dbRoles.map((role) => ({
      id: role.id,
      name: role.name,
      permissionIds: role.permissions.map((p) => p.id),
    }))
  }, [rolesQuery.data, rolesQuery.isPlaceholderData])

  // Map DB members + pending invitations to OverviewUser format
  const users: OverviewUser[] = useMemo(() => {
    const dbMembers = membersQuery.isPlaceholderData
      ? []
      : (membersQuery.data?.data ?? [])
    const activeUsers: OverviewUser[] = dbMembers.map((member) => ({
      id: member.id,
      email: member.email,
      roleId: member.roleId ?? '',
      status: 'active' as const,
      isCreator: member.isCreator,
    }))

    const pendingInvitations = invitationsQuery.isPlaceholderData
      ? []
      : (invitationsQuery.data?.data ?? [])
    const pendingUsers: OverviewUser[] = pendingInvitations.map((inv) => ({
      id: inv.id, // invitation id for revoke actions
      email: inv.email,
      roleId: inv.roleId ?? '',
      status: 'pending' as const,
      isCreator: false,
    }))

    return [...activeUsers, ...pendingUsers]
  }, [
    membersQuery.data,
    membersQuery.isPlaceholderData,
    invitationsQuery.data,
    invitationsQuery.isPlaceholderData,
  ])

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

  const apiKeys =
    canReadApiKey && !apiKeysQuery.isPlaceholderData
      ? (apiKeysQuery.data?.data ?? [])
      : []
  const activeKeys = apiKeys.filter((key) => !key.revoked_at)
  const selectedApiKeyId =
    keySelection.projectId === selectedProjectId && keySelection.id !== null
      ? keySelection.id
      : activeKeys.length === 1
        ? activeKeys[0].id
        : null
  const selectedKey = activeKeys.find((key) => key.id === selectedApiKeyId)
  const apiKey =
    oneTimeKey && oneTimeKey.project_id === selectedProjectId
      ? oneTimeKey.key
      : null
  const selectApiKey = (id: number | null) => {
    if (keyBusy.current) return
    setOneTimeKey(null)
    setKeySelection({ projectId: selectedProjectId, id })
  }
  const runKeyAction = async (action: 'create' | 'rotate' | 'revoke') => {
    if (
      !selectedProjectId ||
      keyBusy.current ||
      apiKeysQuery.isLoading ||
      apiKeysQuery.isError
    )
      return
    if (
      action === 'create'
        ? !canCreateApiKey
        : !selectedKey ||
          !canDeleteApiKey ||
          (action === 'rotate' && !canCreateApiKey)
    )
      return
    keyBusy.current = true
    activeGeneration.current = keyGeneration.current
    const generation = keyGeneration.current
    setKeyError(null)
    try {
      if (action === 'revoke' && selectedKey) {
        await deleteApiKeyMutation.mutateAsync(selectedKey.id)
        if (generation === keyGeneration.current) setOneTimeKey(null)
      } else if (action === 'rotate' && selectedKey) {
        await rotateApiKeyMutation.mutateAsync({
          project_id: selectedProjectId,
          id: selectedKey.id,
        })
      } else {
        await createApiKeyMutation.mutateAsync({
          project_id: selectedProjectId,
        })
      }
    } catch (error) {
      if (generation === keyGeneration.current)
        setKeyError(error instanceof Error ? error.message : t('apiKey.failed'))
    } finally {
      keyBusy.current = false
    }
  }
  const createApiKey = () => {
    void runKeyAction('create')
  }
  const regenerateApiKey = () => {
    void runKeyAction('rotate')
  }
  const revokeApiKey = () => {
    void runKeyAction('revoke')
  }

  const updateUserRole = useCallback(
    (userId: string, roleId: string) => {
      if (!selectedProjectId) return
      updateMemberRoleMutation.mutate({
        project_id: selectedProjectId,
        user_id: userId,
        role_id: roleId,
      })
    },
    [selectedProjectId, updateMemberRoleMutation],
  )

  const removeUser = useCallback(
    (userId: string) => {
      if (!selectedProjectId) return
      // Cannot kick self or the project creator
      if (userId === currentUserId) return
      const target = users.find((u) => u.id === userId)
      if (target?.isCreator) return
      removeMemberMutation.mutate({
        project_id: selectedProjectId,
        user_id: userId,
      })
    },
    [currentUserId, removeMemberMutation, selectedProjectId, users],
  )

  const revokeInvite = useCallback(
    (invitationId: string) => {
      revokeInvitationMutation.mutate({ invitation_id: invitationId })
    },
    [revokeInvitationMutation],
  )

  const inviteMember = useCallback(
    (email: string, roleId?: string) => {
      if (!selectedProjectId) return
      createInvitationMutation.mutate(
        {
          project_id: selectedProjectId,
          email,
          role_id: roleId,
        },
        {
          onSuccess: () => {
            setInviteModalOpen(false)
          },
        },
      )
    },
    [createInvitationMutation, selectedProjectId],
  )

  const addRole = useCallback(
    (payload: { name: string; permissionIds: string[] }) => {
      if (!selectedProjectId) return
      createRoleMutation.mutate(
        {
          project_id: selectedProjectId,
          name: payload.name.trim(),
          permission_ids: payload.permissionIds,
        },
        { onSuccess: () => setAddRoleModalOpen(false) },
      )
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

  const deleteProject = useCallback(() => {
    if (!selectedProjectId) return
    deleteProjectMutation.mutate(selectedProjectId, {
      onSuccess: () => {
        setDeleteProjectModalOpen(false)
        handleDashboardProject({ selectedProjectId: undefined })
      },
    })
  }, [deleteProjectMutation, handleDashboardProject, selectedProjectId])

  return {
    t,
    actionError:
      [
        deleteRoleMutation,
        addRolePermissionMutation,
        removeRolePermissionMutation,
        removeMemberMutation,
        updateMemberRoleMutation,
        revokeInvitationMutation,
      ].find((mutation) => mutation.error)?.error?.message ?? null,
    inviteError: createInvitationMutation.error?.message,
    addRoleError: createRoleMutation.error?.message,
    deleteProjectError: deleteProjectMutation.error?.message,
    isAddingRole: createRoleMutation.isPending,
    tab,
    setTab,
    apiRequests,
    statsError: eventStatsQuery.error?.message ?? null,
    apiRequestsLoading:
      eventStatsQuery.isLoading || eventStatsQuery.isPlaceholderData,
    apiKey,
    apiKeys,
    selectedApiKeyId,
    selectApiKey,
    dismissApiKey: () => setOneTimeKey(null),
    revokeApiKey,
    apiKeyError: keyError ?? apiKeysQuery.error?.message ?? null,
    apiKeyLoading:
      (Boolean(selectedProjectId) &&
        (permissionsPending || permissionsPlaceholder)) ||
      (canReadApiKey &&
        (apiKeysQuery.isLoading || apiKeysQuery.isPlaceholderData)),
    canReadApiKey,
    canCreateApiKey,
    canDeleteApiKey,
    createApiKey,
    regenerateApiKey,
    isRegeneratingApiKey:
      createApiKeyMutation.isPending ||
      rotateApiKeyMutation.isPending ||
      deleteApiKeyMutation.isPending,
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
    isInviting: createInvitationMutation.isPending,
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
    canDeleteProject,
    currentUserId,
    isLoading,
    loadError:
      permissionsQuery.error?.message ??
      (tab === 'roles' && canReadRoles ? rolesQuery.error?.message : null) ??
      (tab === 'users' && canReadUsers ? membersQuery.error?.message : null) ??
      (tab === 'users' && canReadUsers
        ? invitationsQuery.error?.message
        : null) ??
      null,
    hasNoProject: !selectedProjectId,
    projectName,
    deleteProjectModalOpen,
    openDeleteProjectModal: () => setDeleteProjectModalOpen(true),
    closeDeleteProjectModal: () => setDeleteProjectModalOpen(false),
    deleteProject,
    isDeletingProject: deleteProjectMutation.isPending,
  }
}

export { useOverviewService }
export default useOverviewService
