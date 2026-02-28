import { restApiFetcher } from '@/lib/rest-api'
import type { ApiResponse } from '@/lib/rest-api/server/response'
import {
  eventSchemaCreateSchema,
  eventSchemaUpdateSchema,
  type EventSchema,
  type EventSchemaCreatePayload,
  type EventSchemaUpdatePayload,
} from '@/lib/events/events.contract'

const parseResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.error.message || response.error.code)
  }

  return response.data
}

export const fetchSchemas = async (): Promise<EventSchema[]> => {
  const response = await restApiFetcher
    .get('events/schemas')
    .json<ApiResponse<{ items: EventSchema[] }>>()

  return parseResponse(response).items
}

export const createSchema = async (
  payload: EventSchemaCreatePayload,
): Promise<EventSchema> => {
  const parsedPayload = eventSchemaCreateSchema.parse(payload)

  const response = await restApiFetcher
    .post('events/schemas', {
      json: parsedPayload,
    })
    .json<ApiResponse<{ item: EventSchema }>>()

  return parseResponse(response).item
}

export const updateSchema = async (
  schemaId: string,
  payload: EventSchemaUpdatePayload,
): Promise<EventSchema> => {
  const parsedPayload = eventSchemaUpdateSchema.parse(payload)

  const response = await restApiFetcher
    .patch(`events/schemas/${encodeURIComponent(schemaId)}`, {
      json: parsedPayload,
    })
    .json<ApiResponse<{ item: EventSchema }>>()

  return parseResponse(response).item
}

export const deleteSchema = async (schemaId: string): Promise<void> => {
  const response = await restApiFetcher
    .delete(`events/schemas/${encodeURIComponent(schemaId)}`)
    .json<ApiResponse<{ deleted: boolean }>>()

  parseResponse(response)
}
