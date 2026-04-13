import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  ELayoutApi,
  type IBatchComponentsPayload,
  type IBatchComponentsResponse,
  type ICreateLayoutPayload,
  type ILayoutListResponse,
  type ILayoutResponse,
  type IRoleLayoutPayload,
  type IUpdateLayoutPayload,
} from '../interface'

export const layoutsQueryApi = async (
  projectId: string,
  opt: QueryFunctionContext,
): Promise<ILayoutListResponse> => {
  const response = await restApiFetcher.get<ILayoutListResponse>(
    ELayoutApi.LAYOUTS_API,
    {
      searchParams: { project_id: projectId },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const createLayoutApi = async (
  payload: ICreateLayoutPayload,
): Promise<ILayoutResponse> => {
  const response = await restApiFetcher.post<ILayoutResponse>(
    ELayoutApi.LAYOUTS_API,
    { json: payload },
  )

  return response.json()
}

export const updateLayoutApi = async (
  payload: IUpdateLayoutPayload,
): Promise<ILayoutResponse> => {
  const response = await restApiFetcher.patch<ILayoutResponse>(
    ELayoutApi.LAYOUTS_API,
    { json: payload },
  )

  return response.json()
}

export const deleteLayoutApi = async (id: number): Promise<void> => {
  await restApiFetcher.delete(ELayoutApi.LAYOUTS_API, {
    searchParams: { id: String(id) },
  })
}

export const batchComponentsApi = async (
  payload: IBatchComponentsPayload,
): Promise<IBatchComponentsResponse> => {
  const response = await restApiFetcher.post<IBatchComponentsResponse>(
    ELayoutApi.LAYOUTS_COMPONENTS_API,
    { json: payload },
  )

  return response.json()
}

export const addRoleLayoutApi = async (
  payload: IRoleLayoutPayload,
): Promise<void> => {
  await restApiFetcher.post(ELayoutApi.ROLE_LAYOUTS_API, { json: payload })
}

export const removeRoleLayoutApi = async (
  payload: IRoleLayoutPayload,
): Promise<void> => {
  await restApiFetcher.delete(ELayoutApi.ROLE_LAYOUTS_API, { json: payload })
}
