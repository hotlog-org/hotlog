import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type IBatchComponentsPayload,
  type ICreateLayoutPayload,
  type ILayoutListResponse,
  type IRoleLayoutPayload,
  type IUpdateLayoutPayload,
  ELayoutKey,
} from '../interface'

import {
  addRoleLayoutApi,
  batchComponentsApi,
  createLayoutApi,
  deleteLayoutApi,
  layoutsQueryApi,
  removeRoleLayoutApi,
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

export const useUpdateLayoutMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      payload,
    }: {
      projectId: string | undefined
      payload: IUpdateLayoutPayload
    }) => updateLayoutApi(payload),
    onMutate: ({ projectId }) => ({ queryKey: layoutsKey(projectId) }),
    onSuccess: async (response, { payload }, context) => {
      // Publish the confirmed write (including generated component IDs) before
      // refetching. An older in-flight GET must not replace this result.
      if (!context) return
      await queryClient.cancelQueries({ queryKey: context.queryKey })
      queryClient.setQueryData<ILayoutListResponse>(
        context.queryKey,
        (current) =>
          current && {
            ...current,
            data: current.data.map((layout) =>
              layout.id === payload.id ? response.data : layout,
            ),
          },
      )
      queryClient.invalidateQueries({ queryKey: context.queryKey })
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

export const useBatchComponentsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      payload,
    }: {
      projectId: string | undefined
      payload: IBatchComponentsPayload
    }) => batchComponentsApi(payload),
    onMutate: ({ projectId }) => ({ queryKey: layoutsKey(projectId) }),
    onSuccess: async (response, { payload }, context) => {
      // Publish the confirmed write (including generated component IDs) before
      // refetching. An older in-flight GET must not replace this result.
      if (!context) return
      await queryClient.cancelQueries({ queryKey: context.queryKey })
      queryClient.setQueryData<ILayoutListResponse>(
        context.queryKey,
        (current) =>
          current && {
            ...current,
            data: current.data.map((layout) =>
              layout.id === payload.layout_id
                ? { ...layout, components: response.data }
                : layout,
            ),
          },
      )
      queryClient.invalidateQueries({ queryKey: context.queryKey })
    },
  })
}

export const useAddRoleLayoutMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IRoleLayoutPayload) => addRoleLayoutApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: layoutsKey(projectId),
      })
    },
  })
}

export const useRemoveRoleLayoutMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IRoleLayoutPayload) => removeRoleLayoutApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: layoutsKey(projectId),
      })
    },
  })
}
