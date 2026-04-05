import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  EProjectRoleApi,
  type ICreateRolePayload,
  type IProjectRoleResponse,
  type IProjectRolesResponse,
  type IRolePermissionPayload,
} from '../interface'

export const projectRolesQueryApi = async (
  projectId: string,
  opt: QueryFunctionContext,
): Promise<IProjectRolesResponse> => {
  const response = await restApiFetcher.get<IProjectRolesResponse>(
    EProjectRoleApi.PROJECT_ROLES_API,
    {
      searchParams: { project_id: projectId },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const createRoleApi = async (
  payload: ICreateRolePayload,
): Promise<IProjectRoleResponse> => {
  const response = await restApiFetcher.post<IProjectRoleResponse>(
    EProjectRoleApi.PROJECT_ROLES_API,
    { json: payload },
  )

  return response.json()
}

export const deleteRoleApi = async (roleId: string): Promise<void> => {
  await restApiFetcher.delete(EProjectRoleApi.PROJECT_ROLES_API, {
    searchParams: { role_id: roleId },
  })
}

export const addRolePermissionApi = async (
  payload: IRolePermissionPayload,
): Promise<void> => {
  await restApiFetcher.post(EProjectRoleApi.PROJECT_ROLE_PERMISSIONS_API, {
    json: payload,
  })
}

export const removeRolePermissionApi = async (
  payload: IRolePermissionPayload,
): Promise<void> => {
  await restApiFetcher.delete(EProjectRoleApi.PROJECT_ROLE_PERMISSIONS_API, {
    searchParams: {
      role_id: payload.role_id,
      permission_id: payload.permission_id,
    },
  })
}
