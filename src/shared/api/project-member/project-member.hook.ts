import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type IAddMemberPayload,
  type IRemoveMemberPayload,
  type IUpdateMemberRolePayload,
  EProjectMemberKey,
} from '../interface'

import {
  addMemberApi,
  projectMembersQueryApi,
  removeMemberApi,
  updateMemberRoleApi,
} from './project-member.api'

export const useProjectMembersQuery = (projectId?: string) => {
  return useQuery({
    queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY, projectId],
    queryFn: (opt) => projectMembersQueryApi(projectId ?? '', opt),
    enabled: Boolean(projectId),
  })
}

export const useAddMemberMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IAddMemberPayload) => addMemberApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY, projectId],
      })
    },
  })
}

export const useUpdateMemberRoleMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IUpdateMemberRolePayload) =>
      updateMemberRoleApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY, projectId],
      })
    },
  })
}

export const useRemoveMemberMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IRemoveMemberPayload) => removeMemberApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY, projectId],
      })
    },
  })
}
