import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type IBatchFieldsPayload,
  type ICreateSchemaPayload,
  type IUpdateSchemaPayload,
  ESchemaKey,
} from '../interface'

import {
  createSchemaApi,
  saveSchemaDraftApi,
  schemaFieldsQueryApi,
  schemasQueryApi,
  updateSchemaApi,
} from './schema.api'

const schemasKey = (projectId?: string, includeArchived = false) => [
  ESchemaKey.SCHEMAS_QUERY,
  projectId,
  { includeArchived },
]

const fieldsKey = (schemaId?: string, includeArchived = false) => [
  ESchemaKey.SCHEMA_FIELDS_QUERY,
  schemaId,
  { includeArchived },
]

export const useSchemasQuery = (
  projectId?: string,
  options: { includeArchived?: boolean } = {},
) => {
  const includeArchived = options.includeArchived ?? false
  return useQuery({
    queryKey: schemasKey(projectId, includeArchived),
    queryFn: (opt) => schemasQueryApi(projectId ?? '', includeArchived, opt),
    enabled: Boolean(projectId),
  })
}

export const useSchemaFieldsQuery = (
  schemaId?: string,
  options: { includeArchived?: boolean } = {},
) => {
  const includeArchived = options.includeArchived ?? false
  return useQuery({
    queryKey: fieldsKey(schemaId, includeArchived),
    queryFn: (opt) =>
      schemaFieldsQueryApi(schemaId ?? '', includeArchived, opt),
    enabled: Boolean(schemaId),
  })
}

export const useCreateSchemaMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ICreateSchemaPayload) => createSchemaApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ESchemaKey.SCHEMAS_QUERY, projectId],
      })
    },
  })
}

export const useUpdateSchemaMutation = (projectId?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IUpdateSchemaPayload) => updateSchemaApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ESchemaKey.SCHEMAS_QUERY, projectId],
      })
    },
  })
}

export const useSaveSchemaDraftMutation = (
  schemaId?: string,
  projectId?: string,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IBatchFieldsPayload) => saveSchemaDraftApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ESchemaKey.SCHEMA_FIELDS_QUERY, schemaId],
      })
      queryClient.invalidateQueries({
        queryKey: [ESchemaKey.SCHEMAS_QUERY, projectId],
      })
    },
  })
}
