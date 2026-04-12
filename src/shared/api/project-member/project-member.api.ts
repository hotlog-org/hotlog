import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  EProjectMemberApi,
  type IAddMemberPayload,
  type IProjectMembersResponse,
  type IRemoveMemberPayload,
  type IUpdateMemberRolePayload,
} from '../interface'

export const projectMembersQueryApi = async (
  projectId: string,
  opt: QueryFunctionContext,
): Promise<IProjectMembersResponse> => {
  const response = await restApiFetcher.get<IProjectMembersResponse>(
    EProjectMemberApi.PROJECT_MEMBERS_API,
    {
      searchParams: { project_id: projectId },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const addMemberApi = async (
  payload: IAddMemberPayload,
): Promise<void> => {
  await restApiFetcher.post(EProjectMemberApi.PROJECT_MEMBERS_API, {
    json: payload,
  })
}

export const updateMemberRoleApi = async (
  payload: IUpdateMemberRolePayload,
): Promise<void> => {
  await restApiFetcher.patch(EProjectMemberApi.PROJECT_MEMBERS_API, {
    json: payload,
  })
}

export const removeMemberApi = async (
  payload: IRemoveMemberPayload,
): Promise<void> => {
  await restApiFetcher.delete(EProjectMemberApi.PROJECT_MEMBERS_API, {
    searchParams: {
      project_id: payload.project_id,
      user_id: payload.user_id,
    },
  })
}
