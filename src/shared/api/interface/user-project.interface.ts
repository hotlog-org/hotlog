export enum EUserProjectApi {
  USER_PROJECTS_API = 'user/projects',
}

export enum EUserProjectKey {
  USER_PROJECTS_QUERY = 'user_projects_query',
}

export interface IUserProjectDto {
  id: string
  name: string
  createdAt: string
  isCreator: boolean
}

export interface IUserProjectsResponse {
  data: IUserProjectDto[]
}
