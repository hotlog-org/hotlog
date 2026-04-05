export enum EProjectApiKeyApi {
  PROJECT_API_KEYS_API = 'project/api-keys',
}

export enum EProjectApiKeyKey {
  PROJECT_API_KEYS_QUERY = 'project_api_keys_query',
}

export interface IProjectApiKeyDto {
  id: number
  key: string
  project_id: string
}

export interface IProjectApiKeysResponse {
  data: IProjectApiKeyDto[]
}

export interface IProjectApiKeyResponse {
  data: IProjectApiKeyDto
}

export interface ICreateApiKeyPayload {
  project_id: string
}
