import { useCallback, useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import {
  buildAbility,
  hasAbilityPermission,
  type PermissionString,
} from '@/shared/utils'

import { userPermissionsQueryApi } from './user-permission.api'

import { EUserPermissionKey } from '../interface'

export const useUserPermissionsQuery = (projectId?: string) => {
  return useQuery({
    queryKey: [EUserPermissionKey.USER_PERMISSIONS_QUERY, projectId],
    queryFn: (opt) => userPermissionsQueryApi(projectId ?? '', opt),
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export const useUserPermissions = (projectId?: string) => {
  const query = useUserPermissionsQuery(projectId)
  // Global keepPreviousData must never grant the previous project's abilities
  // while the next project's permission request is pending.
  const permissions = useMemo(
    () => (query.isPlaceholderData ? [] : (query.data?.data.permissions ?? [])),
    [query.data, query.isPlaceholderData],
  )

  const ability = useMemo(() => buildAbility(permissions), [permissions])

  const can = useCallback(
    (permission: PermissionString) => hasAbilityPermission(ability, permission),
    [ability],
  )

  return {
    ...query,
    permissions,
    ability,
    can,
  }
}
