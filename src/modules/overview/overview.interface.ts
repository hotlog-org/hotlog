import type { TimeSeriesData } from '@/shared/charts'

export type OverviewTab = 'users' | 'roles'

export type UserStatus = 'active' | 'pending'

export type PermissionCategory =
  | 'events'
  | 'modules'
  | 'api'
  | 'project'
  | 'schema'
  | 'team'
  | 'roles'
  | 'special'

export interface OverviewPermission {
  id: string
  category: PermissionCategory
  label: string
}

export interface OverviewRole {
  id: string
  name: string
  permissionIds: string[]
}

export interface OverviewUser {
  id: string
  name: string
  email: string
  roleId: string
  status: UserStatus
}

export interface RoleOption {
  label: string
  value: string
}

export type ApiRequestSeriesPoint = TimeSeriesData
