import { type QueryFunctionContext } from '@tanstack/react-query'

import { restApiFetcher } from '@/lib/rest-api/fetcher'

import {
  ESchemaApi,
  type IBatchFieldsPayload,
  type ICreateFieldPayload,
  type ICreateSchemaPayload,
  type IFieldListResponse,
  type IFieldResponse,
  type ISchemaListResponse,
  type ISchemaResponse,
  type IUpdateFieldPayload,
  type IUpdateSchemaPayload,
} from '../interface'

export const schemasQueryApi = async (
  projectId: string,
  includeArchived: boolean,
  opt: QueryFunctionContext,
): Promise<ISchemaListResponse> => {
  const response = await restApiFetcher.get<ISchemaListResponse>(
    ESchemaApi.SCHEMAS_API,
    {
      searchParams: {
        project_id: projectId,
        include_archived: String(includeArchived),
      },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const createSchemaApi = async (
  payload: ICreateSchemaPayload,
): Promise<ISchemaResponse> => {
  const response = await restApiFetcher.post<ISchemaResponse>(
    ESchemaApi.SCHEMAS_API,
    { json: payload },
  )

  return response.json()
}

export const updateSchemaApi = async (
  payload: IUpdateSchemaPayload,
): Promise<ISchemaResponse> => {
  const response = await restApiFetcher.patch<ISchemaResponse>(
    ESchemaApi.SCHEMAS_API,
    { json: payload },
  )

  return response.json()
}

export const schemaFieldsQueryApi = async (
  schemaId: string,
  includeArchived: boolean,
  opt: QueryFunctionContext,
): Promise<IFieldListResponse> => {
  const response = await restApiFetcher.get<IFieldListResponse>(
    `${ESchemaApi.SCHEMAS_API}/${schemaId}/fields`,
    {
      searchParams: { include_archived: String(includeArchived) },
      signal: opt.signal,
    },
  )

  return response.json()
}

export const createFieldApi = async (
  payload: ICreateFieldPayload,
): Promise<IFieldResponse> => {
  const { schema_id, ...rest } = payload
  const response = await restApiFetcher.post<IFieldResponse>(
    `${ESchemaApi.SCHEMAS_API}/${schema_id}/fields`,
    { json: rest },
  )

  return response.json()
}

export const updateFieldApi = async (
  schemaId: string,
  payload: IUpdateFieldPayload,
): Promise<IFieldResponse> => {
  const response = await restApiFetcher.patch<IFieldResponse>(
    `${ESchemaApi.SCHEMAS_API}/${schemaId}/fields`,
    { json: payload },
  )

  return response.json()
}

export const saveSchemaDraftApi = async (
  payload: IBatchFieldsPayload,
): Promise<IFieldListResponse> => {
  const { schema_id, ...rest } = payload
  const response = await restApiFetcher.post<IFieldListResponse>(
    `${ESchemaApi.SCHEMAS_API}/${schema_id}/fields/batch`,
    { json: rest },
  )

  return response.json()
}
