export enum EProjectPermissionApi {
  PROJECT_PERMISSIONS_API = 'project/permissions',
}

export enum EProjectPermissionKey {
  PROJECT_PERMISSIONS_QUERY = 'project_permissions_query',
}

export interface IProjectPermissionDto {
  id: string
  action: string
  subject: string
}

export interface IProjectPermissionsResponse {
  data: IProjectPermissionDto[]
}
