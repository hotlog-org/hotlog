import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  EProjectPermissionApi,
  type IProjectPermissionsResponse,
} from '../interface'

export const projectPermissionsQueryApi = async (
  opt: QueryFunctionContext,
): Promise<IProjectPermissionsResponse> => {
  const response = await restApiFetcher.get<IProjectPermissionsResponse>(
    EProjectPermissionApi.PROJECT_PERMISSIONS_API,
    { signal: opt.signal },
  )

  return response.json()
}
