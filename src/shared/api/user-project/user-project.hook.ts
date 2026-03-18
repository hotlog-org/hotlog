import { queryOptions, useQuery } from '@tanstack/react-query'

import { userProjectsQueryApi } from './user-project.api'

import { EUserProjectKey } from '../interface'

const userProjectsQueryOptions = () => {
  return queryOptions({
    queryKey: [EUserProjectKey.USER_PROJECTS_QUERY],
    queryFn: (opt) => userProjectsQueryApi(opt),
  })
}

export const useUserProjectsQuery = () => {
  return useQuery(userProjectsQueryOptions())
}
