import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type IAcceptInvitationPayload,
  type ICreateInvitationPayload,
  type IRevokeInvitationPayload,
  EInvitationKey,
  EProjectMemberKey,
} from '../interface'

import {
  acceptInvitationApi,
  createInvitationApi,
  invitationsQueryApi,
  revokeInvitationApi,
} from './invitation.api'

export const useInvitationsQuery = (projectId?: string) => {
  return useQuery({
    queryKey: [EInvitationKey.INVITATIONS_QUERY, projectId],
    queryFn: (opt) => invitationsQueryApi(projectId ?? '', opt),
    enabled: Boolean(projectId),
  })
}

export const useCreateInvitationMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ICreateInvitationPayload) =>
      createInvitationApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EInvitationKey.INVITATIONS_QUERY, projectId],
      })
    },
  })
}

export const useRevokeInvitationMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IRevokeInvitationPayload) =>
      revokeInvitationApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EInvitationKey.INVITATIONS_QUERY, projectId],
      })
    },
  })
}

export const useAcceptInvitationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IAcceptInvitationPayload) =>
      acceptInvitationApi(payload),
    onSuccess: () => {
      // Invalidate member queries since we just joined a project
      queryClient.invalidateQueries({
        queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY],
      })
    },
  })
}
