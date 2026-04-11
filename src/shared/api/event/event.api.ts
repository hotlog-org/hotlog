import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  EEventApi,
  type IDeleteEventsPayload,
  type IDeleteEventsResponse,
  type IEventListParams,
  type IEventListResponse,
  type IEventStatsResponse,
} from '../interface'

export const eventsListApi = async (
  params: IEventListParams,
  opt: QueryFunctionContext,
): Promise<IEventListResponse> => {
  const searchParams: Record<string, string> = {
    project_id: params.projectId,
    limit: String(params.limit ?? 50),
  }

  if (params.cursor) searchParams.cursor = params.cursor
  if (params.schemas && params.schemas.length > 0) {
    searchParams.schemas = params.schemas.join(',')
  }
  if (params.search && params.search.trim()) {
    searchParams.q = params.search.trim()
  }
  if (params.fieldFilters && params.fieldFilters.length > 0) {
    searchParams.field_filters = JSON.stringify(params.fieldFilters)
  }

  const response = await restApiFetcher.get<IEventListResponse>(
    EEventApi.EVENTS_API,
    {
      searchParams,
      signal: opt.signal,
    },
  )

  return response.json()
}

export const eventStatsApi = async (
  projectId: string,
  days: number,
  opt: QueryFunctionContext,
): Promise<IEventStatsResponse> => {
  const response = await restApiFetcher.get<IEventStatsResponse>(
    EEventApi.EVENT_STATS_API,
    {
      searchParams: {
        project_id: projectId,
        days: String(days),
      },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const deleteEventsApi = async (
  payload: IDeleteEventsPayload,
): Promise<IDeleteEventsResponse> => {
  const response = await restApiFetcher.delete(EEventApi.EVENTS_API, {
    searchParams: {
      project_id: payload.projectId,
      ids: payload.ids.join(','),
    },
  })

  // The shared restApiFetcher is configured with `throwHttpErrors: false`,
  // so we have to translate non-2xx responses into thrown errors ourselves
  // — otherwise the mutation's onError handler never fires and the UI
  // shows a phantom success when RLS silently blocks the delete.
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = (await response.json()) as {
        error?: { message?: string }
      }
      if (body?.error?.message) message = body.error.message
    } catch {
      // ignore JSON parse failures and fall back to the status message
    }
    throw new Error(message)
  }

  return response.json() as Promise<IDeleteEventsResponse>
}
