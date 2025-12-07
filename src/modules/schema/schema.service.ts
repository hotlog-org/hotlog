'use client'

import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useDashboardNavbarExtra } from '@/shared/store/dashboard-navbar-extra.store'
import { SchemaExtraComponent } from './schema-extra.component'

import { MAX_SCHEMA_DEPTH, schemaDefinitions } from './mock-data'
import type {
  SchemaDefinition,
  SchemaFieldNode,
  SchemaFieldType,
  SchemaRow,
} from './schema.interface'

export interface FieldWithMeta extends SchemaFieldNode {
  level: number
  canNest: boolean
  isFocused: boolean
  children?: FieldWithMeta[]
}

export type TFunction = ReturnType<typeof useTranslations>

export interface SchemaService {
  t: ReturnType<typeof useTranslations>
  search: string
  setSearch: (value: string) => void
  rows: SchemaRow[]
  openSchema: (id: string) => void
  closeSchema: () => void
  addSchema: () => void
  deleteSchema: (id: string) => void
  selectedSchema: SchemaDefinition | null
  updateSchemaName: (id: string, name: string) => void
  fieldTree: FieldWithMeta[]
  fieldCount: number
  addField: (schemaId: string, parentId?: string) => void
  deleteField: (schemaId: string, fieldId: string) => void
  updateFieldName: (schemaId: string, fieldId: string, name: string) => void
  updateFieldType: (
    schemaId: string,
    fieldId: string,
    type: SchemaFieldType,
  ) => void
  updateEnumValues: (
    schemaId: string,
    fieldId: string,
    values: string[],
  ) => void
  updateNumberRange: (
    schemaId: string,
    fieldId: string,
    range: { min?: number | null; max?: number | null },
  ) => void
  updateItemType: (
    schemaId: string,
    fieldId: string,
    type: SchemaFieldType,
  ) => void
  selectField: (fieldId: string | null) => void
  selectedFieldId: string | null
  maxDepth: number
}

const countFields = (fields: SchemaFieldNode[]): number =>
  fields.reduce(
    (total, field) =>
      total + 1 + (field.children ? countFields(field.children) : 0),
    0,
  )

const findField = (
  fields: SchemaFieldNode[],
  targetId: string,
  level = 1,
): { field: SchemaFieldNode; level: number } | null => {
  for (const field of fields) {
    if (field.id === targetId) {
      return { field, level }
    }
    if (field.children) {
      const found = findField(field.children, targetId, level + 1)
      if (found) return found
    }
  }
  return null
}

const updateFieldById = (
  fields: SchemaFieldNode[],
  fieldId: string,
  mutate: (field: SchemaFieldNode) => SchemaFieldNode,
): SchemaFieldNode[] =>
  fields.map((field) => {
    if (field.id === fieldId) {
      return mutate(field)
    }
    if (field.children) {
      return {
        ...field,
        children: updateFieldById(field.children, fieldId, mutate),
      }
    }
    return field
  })

const removeFieldById = (
  fields: SchemaFieldNode[],
  fieldId: string,
): SchemaFieldNode[] =>
  fields
    .filter((field) => field.id !== fieldId)
    .map((field) =>
      field.children
        ? { ...field, children: removeFieldById(field.children, fieldId) }
        : field,
    )

const addChildToField = (
  fields: SchemaFieldNode[],
  parentId: string,
  child: SchemaFieldNode,
): SchemaFieldNode[] =>
  fields.map((field) => {
    if (field.id === parentId) {
      const nextChildren = [...(field.children ?? []), child]
      return {
        ...field,
        children: nextChildren,
      }
    }
    if (field.children) {
      return {
        ...field,
        children: addChildToField(field.children, parentId, child),
      }
    }
    return field
  })

const normalizeNumber = (value?: number | null) =>
  Number.isFinite(value) ? Number(value) : undefined

const makeFieldId = (schemaId: string) =>
  `${schemaId}-field-${Math.random().toString(36).slice(2, 7)}`

const useSchemaService = (): SchemaService => {
  const t = useTranslations('modules.dashboard.schema')
  const setNavbarExtra = useDashboardNavbarExtra(
    (state) => state.handleDashboardNavbarExtra,
  )

  const [schemas, setSchemas] = useState<SchemaDefinition[]>(schemaDefinitions)
  const [search, setSearchState] = useState('')
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)

  const filteredSchemas = useMemo(() => {
    if (!search.trim()) return schemas
    const normalized = search.trim().toLowerCase()
    return schemas.filter((schema) =>
      [schema.name, schema.id].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    )
  }, [schemas, search])

  const rows: SchemaRow[] = useMemo(
    () =>
      filteredSchemas.map((schema) => ({
        id: schema.id,
        name: schema.name,
        fieldsCount: countFields(schema.fields),
      })),
    [filteredSchemas],
  )

  const selectedSchema = useMemo(
    () => schemas.find((schema) => schema.id === selectedSchemaId) ?? null,
    [schemas, selectedSchemaId],
  )

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
  }, [])

  const openSchema = useCallback((id: string) => {
    setSelectedSchemaId((current) => {
      if (current === id) return current
      return id
    })
    setSelectedFieldId(null)
  }, [])

  const closeSchema = useCallback(() => {
    setSelectedSchemaId((current) => (current ? null : current))
    setSelectedFieldId(null)
  }, [])

  const updateSchemaName = useCallback((id: string, name: string) => {
    setSchemas((prev) =>
      prev.map((schema) => (schema.id === id ? { ...schema, name } : schema)),
    )
  }, [])

  const addSchema = useCallback(() => {
    const nextId = `schema-${schemas.length + 1}`
    const newSchema: SchemaDefinition = {
      id: nextId,
      name: t('actions.newSchemaName', { index: schemas.length + 1 }),
      version: '1.0',
      fields: [
        {
          id: makeFieldId(nextId),
          name: t('editor.defaultFieldName'),
          type: 'string',
        },
      ],
    }

    setSchemas((prev) => [...prev, newSchema])
    setSelectedSchemaId(nextId)
    setSelectedFieldId(null)
  }, [schemas.length, t])

  const deleteSchema = useCallback(
    (id: string) => {
      setSchemas((prev) => prev.filter((schema) => schema.id !== id))
      if (selectedSchemaId === id) {
        closeSchema()
      }
    },
    [closeSchema, selectedSchemaId],
  )

  const addField = useCallback(
    (schemaId: string, parentId?: string) => {
      const newField: SchemaFieldNode = {
        id: makeFieldId(schemaId),
        name: t('editor.defaultFieldName'),
        type: 'string',
      }

      let added = false

      setSchemas((prev) =>
        prev.map((schema) => {
          if (schema.id !== schemaId) return schema

          if (!parentId) {
            added = true
            return { ...schema, fields: [...schema.fields, newField] }
          }

          const found = findField(schema.fields, parentId)
          if (!found || found.field.type !== 'object') return schema

          if (found.level + 1 > MAX_SCHEMA_DEPTH) return schema

          const nextFields = addChildToField(schema.fields, parentId, newField)
          added = true
          return { ...schema, fields: nextFields }
        }),
      )

      if (added) {
        setSelectedFieldId(newField.id)
      }
    },
    [t],
  )

  const deleteField = useCallback(
    (schemaId: string, fieldId: string) => {
      setSchemas((prev) =>
        prev.map((schema) =>
          schema.id === schemaId
            ? { ...schema, fields: removeFieldById(schema.fields, fieldId) }
            : schema,
        ),
      )
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null)
      }
    },
    [selectedFieldId],
  )

  const updateFieldName = useCallback(
    (schemaId: string, fieldId: string, name: string) => {
      setSchemas((prev) =>
        prev.map((schema) =>
          schema.id === schemaId
            ? {
                ...schema,
                fields: updateFieldById(schema.fields, fieldId, (field) => ({
                  ...field,
                  name,
                })),
              }
            : schema,
        ),
      )
    },
    [],
  )

  const updateFieldType = useCallback(
    (schemaId: string, fieldId: string, type: SchemaFieldType) => {
      setSchemas((prev) =>
        prev.map((schema) =>
          schema.id === schemaId
            ? {
                ...schema,
                fields: updateFieldById(schema.fields, fieldId, (field) => {
                  const base: SchemaFieldNode = {
                    ...field,
                    type,
                  }

                  if (type === 'enum') {
                    base.enumValues =
                      field.enumValues && field.enumValues.length > 0
                        ? field.enumValues
                        : ['value']
                  } else {
                    base.enumValues = undefined
                  }

                  if (type === 'number') {
                    base.numberRange = field.numberRange ?? {
                      min: undefined,
                      max: undefined,
                    }
                  } else {
                    base.numberRange = undefined
                  }

                  if (type === 'array') {
                    base.itemType = field.itemType ?? 'string'
                  } else {
                    base.itemType = undefined
                  }

                  if (type === 'object') {
                    base.children = field.children ?? []
                  } else {
                    base.children = undefined
                  }

                  return base
                }),
              }
            : schema,
        ),
      )
    },
    [],
  )

  const updateEnumValues = useCallback(
    (schemaId: string, fieldId: string, values: string[]) => {
      setSchemas((prev) =>
        prev.map((schema) =>
          schema.id === schemaId
            ? {
                ...schema,
                fields: updateFieldById(schema.fields, fieldId, (field) => ({
                  ...field,
                  enumValues: values,
                })),
              }
            : schema,
        ),
      )
    },
    [],
  )

  const updateNumberRange = useCallback(
    (
      schemaId: string,
      fieldId: string,
      range: { min?: number | null; max?: number | null },
    ) => {
      setSchemas((prev) =>
        prev.map((schema) =>
          schema.id === schemaId
            ? {
                ...schema,
                fields: updateFieldById(schema.fields, fieldId, (field) => ({
                  ...field,
                  numberRange: {
                    min: normalizeNumber(range.min),
                    max: normalizeNumber(range.max),
                  },
                })),
              }
            : schema,
        ),
      )
    },
    [],
  )

  const updateItemType = useCallback(
    (schemaId: string, fieldId: string, type: SchemaFieldType) => {
      setSchemas((prev) =>
        prev.map((schema) =>
          schema.id === schemaId
            ? {
                ...schema,
                fields: updateFieldById(schema.fields, fieldId, (field) => ({
                  ...field,
                  itemType: type,
                })),
              }
            : schema,
        ),
      )
    },
    [],
  )

  const selectField = useCallback((fieldId: string | null) => {
    setSelectedFieldId(fieldId)
  }, [])

  const fieldTree: FieldWithMeta[] = useMemo(() => {
    if (!selectedSchema) return []
    const build = (fields: SchemaFieldNode[], level: number): FieldWithMeta[] =>
      fields.map((field) => ({
        ...field,
        level,
        canNest: level < MAX_SCHEMA_DEPTH,
        isFocused: selectedFieldId === field.id,
        children: field.children ? build(field.children, level + 1) : undefined,
      }))

    return build(selectedSchema.fields, 1)
  }, [selectedSchema, selectedFieldId])

  const fieldCount = useMemo(
    () => (selectedSchema ? countFields(selectedSchema.fields) : 0),
    [selectedSchema],
  )

  useEffect(() => {
    setNavbarExtra({
      component: createElement(SchemaExtraComponent, {
        t,
        search,
        onSearchChange: setSearch,
        onAddSchema: addSchema,
      }),
    })
    return () => setNavbarExtra({ component: undefined })
  }, [addSchema, search, setNavbarExtra, setSearch, t])

  return {
    t,
    search,
    setSearch,
    rows,
    openSchema,
    closeSchema,
    addSchema,
    deleteSchema,
    selectedSchema,
    updateSchemaName,
    fieldTree,
    fieldCount,
    addField,
    deleteField,
    updateFieldName,
    updateFieldType,
    updateEnumValues,
    updateNumberRange,
    updateItemType,
    selectField,
    selectedFieldId,
    maxDepth: MAX_SCHEMA_DEPTH,
  }
}

export default useSchemaService
