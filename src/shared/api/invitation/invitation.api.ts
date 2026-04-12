import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  EInvitationApi,
  type IAcceptInvitationPayload,
  type IAcceptInvitationResponse,
  type ICreateInvitationPayload,
  type IInvitationsResponse,
  type IRevokeInvitationPayload,
} from '../interface'

export const invitationsQueryApi = async (
  projectId: string,
  opt: QueryFunctionContext,
): Promise<IInvitationsResponse> => {
  const response = await restApiFetcher.get<IInvitationsResponse>(
    EInvitationApi.INVITATIONS_API,
    {
      searchParams: { project_id: projectId },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const createInvitationApi = async (
  payload: ICreateInvitationPayload,
): Promise<void> => {
  const response = await restApiFetcher.post(EInvitationApi.INVITATIONS_API, {
    json: payload,
  })

  if (!response.ok) {
    const body = await response.json<{ error: { message: string } }>()
    throw new Error(body.error.message)
  }
}

export const revokeInvitationApi = async (
  payload: IRevokeInvitationPayload,
): Promise<void> => {
  await restApiFetcher.delete(EInvitationApi.INVITATIONS_API, {
    searchParams: { invitation_id: payload.invitation_id },
  })
}

export const acceptInvitationApi = async (
  payload: IAcceptInvitationPayload,
): Promise<IAcceptInvitationResponse> => {
  const response = await restApiFetcher.post(
    EInvitationApi.ACCEPT_INVITATION_API,
    { json: payload },
  )

  if (!response.ok) {
    const body = await response.json<{ error: { message: string } }>()
    throw new Error(body.error.message)
  }

  return response.json()
}
