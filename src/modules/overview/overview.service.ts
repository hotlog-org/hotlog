'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  buildApiRequestsSeries,
  overviewApiKeyMock,
  overviewRolesMock,
  overviewUsersMock,
  permissionCategoryStyles,
  permissionsCatalog,
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

const makeId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`

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
  permissionColors: Record<PermissionCategory, string>
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
}

const useOverviewService = (): OverviewService => {
  const t = useTranslations('modules.dashboard.overview')

  const [tab, setTab] = useState<OverviewTab>('users')
  const [apiKey, setApiKey] = useState(overviewApiKeyMock)
  const [users, setUsers] = useState<OverviewUser[]>(overviewUsersMock)
  const [roles, setRoles] = useState<OverviewRole[]>(overviewRolesMock)
  const [userSearch, setUserSearch] = useState('')
  const [roleSearch, setRoleSearch] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false)

  const apiRequests = useMemo(() => buildApiRequestsSeries(), [])

  const permissionLookup = useMemo(
    () =>
      permissionsCatalog.reduce<Record<string, OverviewPermission>>(
        (map, permission) => {
          map[permission.id] = permission
          return map
        },
        {},
      ),
    [],
  )

  const roleOptions = useMemo<RoleOption[]>(
    () => roles.map((role) => ({ label: role.name, value: role.id })),
    [roles],
  )

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const normalized = userSearch.trim().toLowerCase()

    return users.filter((user) => {
      const role = roles.find((item) => item.id === user.roleId)
      return (
        user.name.toLowerCase().includes(normalized) ||
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

  const updateUserRole = useCallback((userId: string, roleId: string) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, roleId } : user,
      ),
    )
  }, [])

  const removeUser = useCallback((userId: string) => {
    setUsers((current) => current.filter((user) => user.id !== userId))
  }, [])

  const revokeInvite = useCallback(
    (userId: string) => {
      const user = users.find((candidate) => candidate.id === userId)
      if (!user || user.status !== 'pending') return
      removeUser(userId)
    },
    [removeUser, users],
  )

  const inviteMember = useCallback(
    (email: string) => {
      const fallbackRole = roles[roles.length - 1]?.id ?? roles[0]?.id ?? ''
      const localPart = email.split('@')[0] ?? email

      const newUser: OverviewUser = {
        id: makeId('invite'),
        email,
        name: localPart.replace(/[^a-zA-Z0-9]/g, ' ') || email,
        roleId: fallbackRole,
        status: 'pending',
      }

      setUsers((current) => [...current, newUser])
    },
    [roles],
  )

  const addRole = useCallback(
    (payload: { name: string; permissionIds: string[] }) => {
      const newRole: OverviewRole = {
        id: makeId('role'),
        name: payload.name.trim(),
        permissionIds: payload.permissionIds,
      }

      setRoles((current) => [...current, newRole])
    },
    [],
  )

  const deleteRole = useCallback(
    (roleId: string) => {
      setRoles((current) => {
        if (current.length <= 1) return current
        const nextRoles = current.filter((role) => role.id !== roleId)
        const fallbackRoleId = nextRoles[0]?.id ?? current[0]?.id ?? ''

        setUsers((userState) =>
          userState.map((user) =>
            user.roleId === roleId ? { ...user, roleId: fallbackRoleId } : user,
          ),
        )

        return nextRoles
      })
    },
    [],
  )

  const addPermissionToRole = useCallback(
    (roleId: string, permissionId: string) => {
      setRoles((current) =>
        current.map((role) =>
          role.id === roleId
            ? role.permissionIds.includes(permissionId)
              ? role
              : { ...role, permissionIds: [...role.permissionIds, permissionId] }
            : role,
        ),
      )
    },
    [],
  )

  const removePermissionFromRole = useCallback(
    (roleId: string, permissionId: string) => {
      setRoles((current) =>
        current.map((role) =>
          role.id === roleId
            ? {
                ...role,
                permissionIds: role.permissionIds.filter(
                  (id) => id !== permissionId,
                ),
              }
            : role,
        ),
      )
    },
    [],
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
    permissions: permissionsCatalog,
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
  }
}

export { useOverviewService }
export default useOverviewService
