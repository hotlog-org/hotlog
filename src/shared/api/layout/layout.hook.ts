import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type IBatchComponentsPayload,
  type ICreateLayoutPayload,
  type IUpdateLayoutPayload,
  ELayoutKey,
} from '../interface'

import {
  batchComponentsApi,
  createLayoutApi,
  deleteLayoutApi,
  layoutsQueryApi,
  updateLayoutApi,
} from './layout.api'

const layoutsKey = (projectId?: string) => [
  ELayoutKey.LAYOUTS_QUERY,
  projectId,
]

export const useLayoutsQuery = (projectId?: string) => {
  return useQuery({
    queryKey: layoutsKey(projectId),
    queryFn: (opt) => layoutsQueryApi(projectId ?? '', opt),
    enabled: Boolean(projectId),
  })
}

export const useCreateLayoutMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ICreateLayoutPayload) => createLayoutApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: layoutsKey(projectId),
      })
    },
  })
}

export const useUpdateLayoutMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IUpdateLayoutPayload) => updateLayoutApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: layoutsKey(projectId),
      })
    },
  })
}

export const useDeleteLayoutMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteLayoutApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: layoutsKey(projectId),
      })
    },
  })
}

export const useBatchComponentsMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IBatchComponentsPayload) =>
      batchComponentsApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: layoutsKey(projectId),
      })
    },
  })
}
