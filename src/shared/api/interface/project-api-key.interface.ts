export enum EProjectApiKeyApi {
  PROJECT_API_KEYS_API = 'project/api-keys',
}

export enum EProjectApiKeyKey {
  PROJECT_API_KEYS_QUERY = 'project_api_keys_query',
}

export interface IProjectApiKeyDto {
  id: number
  key_prefix: string
  last_used_at: string | null
  revoked_at: string | null
  project_id: string
}

export interface IProjectApiKeysResponse {
  data: IProjectApiKeyDto[]
}

export interface IProjectApiKeyResponse {
  data: IProjectApiKeyDto & { key: string }
}

export interface ICreateApiKeyPayload {
  project_id: string
}

export interface IRotateApiKeyPayload extends ICreateApiKeyPayload {
  id: number
}
