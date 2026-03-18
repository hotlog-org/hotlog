import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import { EUserProjectApi, type IUserProjectsResponse } from '../interface'

export const userProjectsQueryApi = async (
  opt: QueryFunctionContext,
): Promise<IUserProjectsResponse> => {
  const response = await restApiFetcher.get<IUserProjectsResponse>(
    EUserProjectApi.USER_PROJECTS_API,
    {
      signal: opt.signal,
    },
  )

  return response.json()
}
