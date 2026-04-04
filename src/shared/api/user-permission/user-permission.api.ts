import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import { EUserPermissionApi, type IUserPermissionsResponse } from '../interface'

export const userPermissionsQueryApi = async (
  projectId: string,
  opt: QueryFunctionContext,
): Promise<IUserPermissionsResponse> => {
  const response = await restApiFetcher.get<IUserPermissionsResponse>(
    EUserPermissionApi.USER_PERMISSIONS_API,
    {
      searchParams: {
        project_id: projectId,
      },
      signal: opt.signal,
    },
  )

  return response.json()
}
