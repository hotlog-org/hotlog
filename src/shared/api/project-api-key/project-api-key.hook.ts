import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type ICreateApiKeyPayload,
  type IRotateApiKeyPayload,
  type IProjectApiKeyResponse,
  type IProjectApiKeysResponse,
  EProjectApiKeyKey,
} from '../interface'

import {
  createApiKeyApi,
  rotateApiKeyApi,
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
  queryKey: ReturnType<typeof apiKeysKey>
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

// Deliver the secret directly to ephemeral UI state and return only metadata.
// Neither QueryCache nor MutationCache may retain a raw credential.
const consumeSecret = (
  response: IProjectApiKeyResponse,
  onSecret: (value: IProjectApiKeyResponse['data']) => void,
) => {
  const { key, ...metadata } = response.data
  onSecret({ ...metadata, key })
  return { data: metadata }
}

export const useCreateApiKeyMutation = (
  projectId: string | undefined,
  onSecret: (value: IProjectApiKeyResponse['data']) => void,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    retry: false,
    mutationFn: async (payload: ICreateApiKeyPayload) =>
      consumeSecret(await createApiKeyApi(payload), onSecret),
    onMutate: (payload) => ({ queryKey: apiKeysKey(payload.project_id) }),
    onSettled: (_data, _error, _payload, context) => {
      if (!context) return
      queryClient.invalidateQueries({ queryKey: context.queryKey })
    },
  })
}

export const useDeleteApiKeyMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    scope: mutationScope(projectId),
    mutationFn: (id: number) => deleteApiKeyApi(id),
    onMutate: async (id): Promise<MutationContext> => {
      const queryKey = apiKeysKey(projectId)
      await queryClient.cancelQueries({ queryKey })
      const previous =
        queryClient.getQueryData<IProjectApiKeysResponse>(queryKey)

      queryClient.setQueryData<IProjectApiKeysResponse>(queryKey, (old) => ({
        data: (old?.data ?? []).filter((key) => key.id !== id),
      }))

      return { queryKey, previous, hadPrevious: previous !== undefined }
    },
    onError: (_err, id, context) => {
      if (!context) return
      // Undo only this deletion; a full snapshot resurrects other pending or
      // successful deletions even though mutation requests share a scope.
      if (context.hadPrevious) {
        const removed = context.previous?.data.find((item) => item.id === id)
        if (!removed) return
        queryClient.setQueryData<IProjectApiKeysResponse>(
          context.queryKey,
          (current) => {
            const data = [...(current?.data ?? [])]
            if (!data.some((item) => item.id === id)) {
              const index = context.previous!.data.findIndex(
                (item) => item.id === id,
              )
              data.splice(Math.min(index, data.length), 0, removed)
            }
            return { ...current, data }
          },
        )
      } else if (
        !queryClient.getQueryData<IProjectApiKeysResponse>(context.queryKey)
          ?.data.length
      ) {
        queryClient.removeQueries({ queryKey: context.queryKey })
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return
      queryClient.invalidateQueries({ queryKey: context.queryKey })
    },
  })
}

export const useRotateApiKeyMutation = (
  projectId: string | undefined,
  onSecret: (value: IProjectApiKeyResponse['data']) => void,
) => {
  const queryClient = useQueryClient()
  return useMutation({
    scope: mutationScope(projectId),
    retry: false,
    mutationFn: async (payload: IRotateApiKeyPayload) =>
      consumeSecret(await rotateApiKeyApi(payload), onSecret),
    onMutate: (payload) => ({ queryKey: apiKeysKey(payload.project_id) }),
    onSettled: (_data, _error, _payload, context) => {
      if (!context) return
      queryClient.invalidateQueries({ queryKey: context.queryKey })
    },
  })
}
