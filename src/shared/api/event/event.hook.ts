import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  type IDeleteEventsPayload,
  type IEventFieldFilter,
  type IEventListResponse,
  EEventKey,
} from '../interface'

import { deleteEventsApi, eventStatsApi, eventsListApi } from './event.api'

export interface UseEventsInfiniteQueryParams {
  projectId?: string
  schemas?: string[]
  search?: string
  fieldFilters?: IEventFieldFilter[]
  limit?: number
}

export const useEventsInfiniteQuery = (
  params: UseEventsInfiniteQueryParams,
) => {
  const projectId = params.projectId
  const schemas = params.schemas ?? []
  const search = params.search ?? ''
  const fieldFilters = params.fieldFilters ?? []
  const limit = params.limit ?? 50

  return useInfiniteQuery({
    queryKey: [
      EEventKey.EVENTS_QUERY,
      projectId,
      { schemas, search, fieldFilters, limit },
    ],
    initialPageParam: null as string | null,
    queryFn: (opt) =>
      eventsListApi(
        {
          projectId: projectId ?? '',
          limit,
          cursor: opt.pageParam,
          schemas,
          search,
          fieldFilters,
        },
        opt,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(projectId),
  })
}

export const useEventStatsQuery = (projectId?: string, days = 30) => {
  return useQuery({
    queryKey: [EEventKey.EVENT_STATS_QUERY, projectId, days],
    queryFn: (opt) => eventStatsApi(projectId ?? '', days, opt),
    enabled: Boolean(projectId),
  })
}

type EventsInfiniteData = InfiniteData<IEventListResponse, string | null>

interface DeleteMutationContext {
  // [queryKey, previousData] tuples so we can roll back exactly the
  // queries we touched if the mutation fails.
  snapshots: Array<{
    queryKey: readonly unknown[]
    data: EventsInfiniteData | undefined
  }>
}

export const useDeleteEventsMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IDeleteEventsPayload) => deleteEventsApi(payload),
    onMutate: async (payload): Promise<DeleteMutationContext> => {
      // Stop in-flight refetches so they don't clobber our optimistic edit.
      await queryClient.cancelQueries({
        queryKey: [EEventKey.EVENTS_QUERY, payload.projectId],
      })

      const idsToRemove = new Set(payload.ids)
      const snapshots: DeleteMutationContext['snapshots'] = []

      // Walk every cached events list for this project (one per filter
      // combination) and prune the ids. We snapshot the previous state of
      // each so onError can roll back exactly what we changed.
      const matches = queryClient.getQueriesData<EventsInfiniteData>({
        queryKey: [EEventKey.EVENTS_QUERY, payload.projectId],
      })

      for (const [queryKey, previous] of matches) {
        snapshots.push({ queryKey, data: previous })
        if (!previous) continue

        const nextPages = previous.pages.map((page) => ({
          ...page,
          data: page.data.filter((event) => !idsToRemove.has(event.id)),
        }))

        queryClient.setQueryData<EventsInfiniteData>(queryKey, {
          ...previous,
          pages: nextPages,
        })
      }

      return { snapshots }
    },
    onError: (_err, _payload, context) => {
      if (!context) return
      // Roll back every query we touched.
      for (const snapshot of context.snapshots) {
        queryClient.setQueryData(snapshot.queryKey, snapshot.data)
      }
    },
    onSettled: () => {
      // Refetch to reconcile with the server: confirms the optimistic
      // edit on success, restores the canonical truth on error.
      queryClient.invalidateQueries({
        queryKey: [EEventKey.EVENTS_QUERY, projectId],
      })
      queryClient.invalidateQueries({
        queryKey: [EEventKey.EVENT_STATS_QUERY, projectId],
      })
    },
  })
}
