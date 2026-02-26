import { restApiFetcher } from '@/lib/rest-api'
import {
  eventListQuerySchema,
  type EventListQuery,
  type EventListResult,
  type EventSchema,
} from '@/lib/events/events.contract'
import type { ApiResponse } from '@/lib/rest-api/server/response'

const parseResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.error.message || response.error.code)
  }

  return response.data
}

const toSearchParams = (query: EventListQuery): URLSearchParams => {
  const params = new URLSearchParams()

  if (query.search) {
    params.set('search', query.search)
  }

  if (query.schemaIds?.length) {
    query.schemaIds.forEach((schemaId) => {
      params.append('schemaIds', schemaId)
    })
  }

  if (query.limit !== undefined) {
    params.set('limit', String(query.limit))
  }

  if (query.offset !== undefined) {
    params.set('offset', String(query.offset))
  }

  return params
}

export const fetchEvents = async (
  query: EventListQuery = {},
): Promise<EventListResult> => {
  const parsed = eventListQuerySchema.parse(query)

  const response = await restApiFetcher
    .get('events', {
      searchParams: toSearchParams(parsed),
    })
    .json<ApiResponse<EventListResult>>()

  return parseResponse(response)
}

export const fetchEventSchemas = async (): Promise<EventSchema[]> => {
  const response = await restApiFetcher
    .get('events/schemas')
    .json<ApiResponse<{ items: EventSchema[] }>>()

  const data = parseResponse(response)

  return data.items
}
