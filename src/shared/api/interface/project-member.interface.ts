export enum EProjectMemberApi {
  PROJECT_MEMBERS_API = 'project/members',
}

export enum EProjectMemberKey {
  PROJECT_MEMBERS_QUERY = 'project_members_query',
}

export interface IProjectMemberDto {
  id: string
  email: string
  roleId: string | null
  roleName: string | null
  isCreator: boolean
}

export interface IProjectMembersResponse {
  data: IProjectMemberDto[]
}

export interface IAddMemberPayload {
  project_id: string
  user_id: string
  role_id?: string
}

export interface IUpdateMemberRolePayload {
  project_id: string
  user_id: string
  role_id: string
}

export interface IRemoveMemberPayload {
  project_id: string
  user_id: string
}
