import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  EProjectApiKeyApi,
  type ICreateApiKeyPayload,
  type IProjectApiKeyResponse,
  type IProjectApiKeysResponse,
} from '../interface'

export const projectApiKeysQueryApi = async (
  projectId: string,
  opt: QueryFunctionContext,
): Promise<IProjectApiKeysResponse> => {
  const response = await restApiFetcher.get<IProjectApiKeysResponse>(
    EProjectApiKeyApi.PROJECT_API_KEYS_API,
    {
      searchParams: { project_id: projectId },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const createApiKeyApi = async (
  payload: ICreateApiKeyPayload,
): Promise<IProjectApiKeyResponse> => {
  const response = await restApiFetcher.post<IProjectApiKeyResponse>(
    EProjectApiKeyApi.PROJECT_API_KEYS_API,
    { json: payload },
  )

  return response.json()
}

export const deleteApiKeyApi = async (id: number): Promise<void> => {
  await restApiFetcher.delete(EProjectApiKeyApi.PROJECT_API_KEYS_API, {
    searchParams: { id: String(id) },
  })
}
