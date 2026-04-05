import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type ICreateApiKeyPayload,
  type IProjectApiKeysResponse,
  EProjectApiKeyKey,
} from '../interface'

import {
  createApiKeyApi,
  deleteApiKeyApi,
  projectApiKeysQueryApi,
} from './project-api-key.api'

const apiKeysKey = (projectId?: string) => [
  EProjectApiKeyKey.PROJECT_API_KEYS_QUERY,
  projectId,
]

const mutationScope = (projectId?: string) => ({
  id: `project-api-keys-${projectId ?? 'none'}`,
})

interface MutationContext {
  previous: IProjectApiKeysResponse | undefined
  hadPrevious: boolean
}

export const useProjectApiKeysQuery = (projectId?: string) => {
  return useQuery({
    queryKey: apiKeysKey(projectId),
    queryFn: (opt) => projectApiKeysQueryApi(projectId ?? '', opt),
    enabled: Boolean(projectId),
  })
}

export const useCreateApiKeyMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (payload: ICreateApiKeyPayload) => createApiKeyApi(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysKey(projectId) })
    },
  })
}

export const useDeleteApiKeyMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (id: number) => deleteApiKeyApi(id),
    onMutate: async (id): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: apiKeysKey(projectId) })
      const previous = queryClient.getQueryData<IProjectApiKeysResponse>(
        apiKeysKey(projectId),
      )

      queryClient.setQueryData<IProjectApiKeysResponse>(
        apiKeysKey(projectId),
        (old) => ({
          data: (old?.data ?? []).filter((key) => key.id !== id),
        }),
      )

      return { previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, _id, context) => {
      if (!context) return
      if (context.hadPrevious) {
        queryClient.setQueryData(apiKeysKey(projectId), context.previous)
      } else {
        queryClient.removeQueries({ queryKey: apiKeysKey(projectId) })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysKey(projectId) })
    },
  })
}
