import type { PermissionString } from '@/shared/utils'

export enum EUserPermissionApi {
  USER_PERMISSIONS_API = 'user/permissions',
}

export enum EUserPermissionKey {
  USER_PERMISSIONS_QUERY = 'user_permissions_query',
}

export interface IUserPermissionsDto {
  projectId: string
  permissions: PermissionString[]
}

export interface IUserPermissionsResponse {
  data: IUserPermissionsDto
}
