export enum EProjectRoleApi {
  PROJECT_ROLES_API = 'project/roles',
  PROJECT_ROLE_PERMISSIONS_API = 'project/role-permissions',
}

export enum EProjectRoleKey {
  PROJECT_ROLES_QUERY = 'project_roles_query',
}

export interface IPermissionDto {
  id: string
  action: string
  subject: string
}

export interface IProjectRoleDto {
  id: string
  name: string
  createdAt: string
  permissions: IPermissionDto[]
}

export interface IProjectRolesResponse {
  data: IProjectRoleDto[]
}

export interface IProjectRoleResponse {
  data: IProjectRoleDto
}

export interface ICreateRolePayload {
  project_id: string
  name: string
  permission_ids: string[]
}

export interface IRolePermissionPayload {
  role_id: string
  permission_id: string
}
