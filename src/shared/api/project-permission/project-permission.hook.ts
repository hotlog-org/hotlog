import { useQuery } from '@tanstack/react-query'

import { EProjectPermissionKey } from '../interface'

import { projectPermissionsQueryApi } from './project-permission.api'

export const useProjectPermissionsQuery = () => {
  return useQuery({
    queryKey: [EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY],
    queryFn: (opt) => projectPermissionsQueryApi(opt),
    staleTime: 1000 * 60 * 30,
  })
}
