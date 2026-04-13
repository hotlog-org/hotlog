'use client'

import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useDashboardNavbarExtra } from '@/shared/store/dashboard-navbar-extra.store'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useUserPermissions } from '@/shared/api/user-permission'
import {
  type IBatchFieldCreate,
  type IBatchFieldUpdate,
  type IFieldDto,
  type IFieldMetadata,
  type ISchemaDto,
} from '@/shared/api/interface'
import {
  useCreateSchemaMutation,
  useSaveSchemaDraftMutation,
  useSchemaFieldsQuery,
  useSchemasQuery,
  useUpdateSchemaMutation,
} from '@/shared/api/schema'
import { slugifyKey, isValidFieldKey } from '@/lib/schema-validator'

import { SchemaExtraComponent } from './extra/schema-extra.component'
import {
  DB_TO_FIELD_TYPE,
  FIELD_TYPE_TO_DB,
  type SchemaDefinition,
  type SchemaFieldNode,
  type SchemaFieldType,
  type SchemaRow,
} from './schema.interface'

export type TFunction = ReturnType<typeof useTranslations>

export interface FieldWithMeta extends SchemaFieldNode {
  isFocused: boolean
}

export interface SchemaService {
  t: TFunction
  search: string
  setSearch: (value: string) => void
  rows: SchemaRow[]
  isLoading: boolean
  hasNoProject: boolean
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canArchive: boolean
  canCreateFields: boolean
  canUpdateFields: boolean
  canArchiveFields: boolean

  // Editor
  selectedSchema: SchemaDefinition | null
  fields: FieldWithMeta[]
  fieldCount: number
  archivedFieldCount: number
  isFieldsLoading: boolean
  isDirty: boolean
  isSaving: boolean
  showArchived: boolean
  toggleShowArchived: () => void
  selectedFieldId: string | null

  openSchema: (id: string) => void
  closeSchema: () => void

  // Schema-level actions
  addSchema: () => void
  createSchemaOpen: boolean
  closeCreateSchema: () => void
  submitCreateSchema: (displayName: string) => Promise<void>
  isCreatingSchema: boolean
  createSchemaError: string | null

  archiveSchema: (id: string) => void
  updateSchemaDisplayName: (value: string) => void

  // Field-level actions
  addField: () => void
  archiveField: (fieldId: string) => void
  restoreField: (fieldId: string) => void
  updateFieldDisplayName: (fieldId: string, value: string) => void
  updateFieldKey: (fieldId: string, value: string) => void
  updateFieldRequired: (fieldId: string, value: boolean) => void
  updateFieldDescription: (fieldId: string, value: string) => void
  updateFieldType: (fieldId: string, type: SchemaFieldType) => void
  updateEnumValues: (fieldId: string, values: string[]) => void
  updateNumberRange: (
    fieldId: string,
    range: { min?: number | null; max?: number | null },
  ) => void
  updateItemType: (fieldId: string, type: SchemaFieldType) => void
  selectField: (fieldId: string | null) => void

  saveSchema: () => Promise<void>
  cancelEdit: () => void
  saveError: string | null
}

const tempIdPrefix = '__draft_'
const makeTempId = () =>
  `${tempIdPrefix}${
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`
  }`
const isTempId = (id: string) => id.startsWith(tempIdPrefix)

const dtoToNode = (dto: IFieldDto): SchemaFieldNode => {
  const meta = (dto.metadata ?? {}) as IFieldMetadata
  return {
    id: dto.id,
    key: dto.key,
    displayName: dto.displayName,
    type: DB_TO_FIELD_TYPE[dto.type],
    required: dto.required,
    status: dto.status,
    description: meta.description,
    enumValues: meta.enumValues,
    numberRange: meta.numberRange,
    itemType: meta.itemType as SchemaFieldType | undefined,
    isNew: false,
    isDirty: false,
  }
}

const nodeToMetadata = (node: SchemaFieldNode): IFieldMetadata => {
  const meta: IFieldMetadata = {}
  if (node.description) meta.description = node.description
  if (node.enumValues && node.enumValues.length > 0)
    meta.enumValues = node.enumValues
  if (
    node.numberRange &&
    (node.numberRange.min != null || node.numberRange.max != null)
  ) {
    meta.numberRange = {
      min: node.numberRange.min ?? null,
      max: node.numberRange.max ?? null,
    }
  }
  if (node.itemType) meta.itemType = node.itemType
  return meta
}

const nodesEqual = (a: SchemaFieldNode, b: SchemaFieldNode): boolean => {
  if (a.displayName !== b.displayName) return false
  if (a.required !== b.required) return false
  if (a.status !== b.status) return false
  if ((a.description ?? '') !== (b.description ?? '')) return false
  const aEnums = (a.enumValues ?? []).join('|')
  const bEnums = (b.enumValues ?? []).join('|')
  if (aEnums !== bEnums) return false
  if ((a.numberRange?.min ?? null) !== (b.numberRange?.min ?? null))
    return false
  if ((a.numberRange?.max ?? null) !== (b.numberRange?.max ?? null))
    return false
  if ((a.itemType ?? '') !== (b.itemType ?? '')) return false
  return true
}

const useSchemaService = (): SchemaService => {
  const t = useTranslations('modules.dashboard.schema')
  const setNavbarExtra = useDashboardNavbarExtra(
    (state) => state.handleDashboardNavbarExtra,
  )

  const selectedProjectId = useDashboardProject((s) => s.selectedProjectId)
  const { can } = useUserPermissions(selectedProjectId)

  const canRead = can('read:schemas')
  const canCreate = can('create:schemas')
  const canUpdate = can('update:schemas')
  const canArchive = can('delete:schemas')
  const canCreateFields = can('create:fields')
  const canUpdateFields = can('update:fields')
  const canArchiveFields = can('delete:fields')

  const [search, setSearchState] = useState('')
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [draftFields, setDraftFields] = useState<SchemaFieldNode[]>([])
  const [originalFields, setOriginalFields] = useState<SchemaFieldNode[]>([])
  const [draftDisplayName, setDraftDisplayName] = useState('')
  const [originalDisplayName, setOriginalDisplayName] = useState('')
  const [createSchemaOpen, setCreateSchemaOpen] = useState(false)
  const [createSchemaError, setCreateSchemaError] = useState<string | null>(
    null,
  )
  const [saveError, setSaveError] = useState<string | null>(null)

  const schemasQuery = useSchemasQuery(
    canRead ? selectedProjectId : undefined,
    { includeArchived: false },
  )
  const fieldsQuery = useSchemaFieldsQuery(selectedSchemaId ?? undefined, {
    includeArchived: showArchived,
  })

  const createSchemaMutation = useCreateSchemaMutation(selectedProjectId)
  const updateSchemaMutation = useUpdateSchemaMutation(selectedProjectId)
  const saveDraftMutation = useSaveSchemaDraftMutation(
    selectedSchemaId ?? undefined,
    selectedProjectId,
  )

  const schemas: ISchemaDto[] = useMemo(
    () => schemasQuery.data?.data ?? [],
    [schemasQuery.data],
  )

  const filteredSchemas = useMemo(() => {
    if (!search.trim()) return schemas
    const normalized = search.trim().toLowerCase()
    return schemas.filter((schema) =>
      [schema.displayName, schema.key].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    )
  }, [schemas, search])

  const rows: SchemaRow[] = useMemo(
    () =>
      filteredSchemas.map((schema) => ({
        id: schema.id,
        key: schema.key,
        displayName: schema.displayName,
        fieldsCount: schema.fieldsCount,
        eventsCount: schema.eventsCount,
      })),
    [filteredSchemas],
  )

  const selectedSchemaDto = useMemo(
    () => schemas.find((s) => s.id === selectedSchemaId) ?? null,
    [schemas, selectedSchemaId],
  )

  // Sync draft from server when fields query loads or schema changes
  useEffect(() => {
    if (!selectedSchemaDto) {
      setDraftFields([])
      setOriginalFields([])
      setDraftDisplayName('')
      setOriginalDisplayName('')
      return
    }
    setDraftDisplayName(selectedSchemaDto.displayName)
    setOriginalDisplayName(selectedSchemaDto.displayName)
  }, [selectedSchemaDto])

  useEffect(() => {
    if (!selectedSchemaId) return
    const data = fieldsQuery.data?.data
    if (!data) return
    const nodes = data.map(dtoToNode)
    setOriginalFields(nodes)
    // Hydrate the draft from the server unless the user has unsaved
    // changes — only `isNew`/`isDirty` flags signal real edits, so an
    // empty `prev` (initial open or post-save) always rehydrates.
    setDraftFields((prev) => {
      const hasUnsavedChanges = prev.some((f) => f.isNew || f.isDirty)
      if (hasUnsavedChanges) return prev
      return nodes
    })
  }, [fieldsQuery.data, selectedSchemaId])

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
  }, [])

  const openSchema = useCallback((id: string) => {
    setSelectedSchemaId(id)
    setSelectedFieldId(null)
    setSaveError(null)
  }, [])

  const closeSchema = useCallback(() => {
    setSelectedSchemaId(null)
    setSelectedFieldId(null)
    setDraftFields([])
    setOriginalFields([])
    setSaveError(null)
  }, [])

  const addSchema = useCallback(() => {
    setCreateSchemaError(null)
    setCreateSchemaOpen(true)
  }, [])

  const closeCreateSchema = useCallback(() => {
    setCreateSchemaOpen(false)
    setCreateSchemaError(null)
  }, [])

  const submitCreateSchema = useCallback(
    async (displayName: string) => {
      if (!selectedProjectId) return
      const trimmed = displayName.trim()
      if (!trimmed) {
        setCreateSchemaError(t('validation.displayNameRequired'))
        return
      }
      const key = slugifyKey(trimmed)
      if (!isValidFieldKey(key)) {
        setCreateSchemaError(t('validation.keyFormat'))
        return
      }

      setCreateSchemaError(null)
      try {
        const result = await createSchemaMutation.mutateAsync({
          project_id: selectedProjectId,
          key,
          display_name: trimmed,
        })
        setCreateSchemaOpen(false)
        setSelectedSchemaId(result.data.id)
      } catch (err) {
        setCreateSchemaError(
          err instanceof Error ? err.message : t('validation.createFailed'),
        )
      }
    },
    [createSchemaMutation, selectedProjectId, t],
  )

  const archiveSchema = useCallback(
    (id: string) => {
      updateSchemaMutation.mutate(
        { id, status: 'archived' },
        {
          onSuccess: () => {
            if (selectedSchemaId === id) {
              closeSchema()
            }
          },
        },
      )
    },
    [closeSchema, selectedSchemaId, updateSchemaMutation],
  )

  const updateSchemaDisplayName = useCallback((value: string) => {
    setDraftDisplayName(value)
  }, [])

  const addField = useCallback(() => {
    if (!selectedSchemaId) return
    const defaultName = t('editor.defaultFieldName')
    const newField: SchemaFieldNode = {
      id: makeTempId(),
      key: slugifyKey(defaultName) || 'new_field',
      displayName: defaultName,
      type: 'string',
      required: false,
      status: 'active',
      isNew: true,
      isDirty: true,
      keyManuallyEdited: false,
    }
    setDraftFields((prev) => [...prev, newField])
    setSelectedFieldId(newField.id)
  }, [selectedSchemaId, t])

  const updateField = useCallback(
    (fieldId: string, mutate: (field: SchemaFieldNode) => SchemaFieldNode) => {
      setDraftFields((prev) =>
        prev.map((field) => {
          if (field.id !== fieldId) return field
          const next = mutate(field)
          if (next === field) return field
          return { ...next, isDirty: true }
        }),
      )
    },
    [],
  )

  const updateFieldDisplayName = useCallback(
    (fieldId: string, value: string) => {
      updateField(fieldId, (field) => {
        const next = { ...field, displayName: value }
        if (field.isNew && !field.keyManuallyEdited) {
          next.key = slugifyKey(value) || field.key
        }
        return next
      })
    },
    [updateField],
  )

  const updateFieldKey = useCallback(
    (fieldId: string, value: string) => {
      updateField(fieldId, (field) => {
        if (!field.isNew) return field
        return { ...field, key: value, keyManuallyEdited: true }
      })
    },
    [updateField],
  )

  const updateFieldRequired = useCallback(
    (fieldId: string, value: boolean) => {
      updateField(fieldId, (field) => ({ ...field, required: value }))
    },
    [updateField],
  )

  const updateFieldDescription = useCallback(
    (fieldId: string, value: string) => {
      updateField(fieldId, (field) => ({ ...field, description: value }))
    },
    [updateField],
  )

  const updateFieldType = useCallback(
    (fieldId: string, type: SchemaFieldType) => {
      updateField(fieldId, (field) => {
        if (!field.isNew) return field
        const next: SchemaFieldNode = { ...field, type }
        if (type === 'enum') {
          next.enumValues = field.enumValues ?? ['value']
        } else {
          next.enumValues = undefined
        }
        if (type === 'number') {
          next.numberRange = field.numberRange ?? { min: null, max: null }
        } else {
          next.numberRange = undefined
        }
        if (type === 'array') {
          next.itemType = field.itemType ?? 'string'
        } else {
          next.itemType = undefined
        }
        return next
      })
    },
    [updateField],
  )

  const updateEnumValues = useCallback(
    (fieldId: string, values: string[]) => {
      updateField(fieldId, (field) => ({ ...field, enumValues: values }))
    },
    [updateField],
  )

  const updateNumberRange = useCallback(
    (fieldId: string, range: { min?: number | null; max?: number | null }) => {
      updateField(fieldId, (field) => ({
        ...field,
        numberRange: {
          min: range.min ?? null,
          max: range.max ?? null,
        },
      }))
    },
    [updateField],
  )

  const updateItemType = useCallback(
    (fieldId: string, type: SchemaFieldType) => {
      updateField(fieldId, (field) => ({ ...field, itemType: type }))
    },
    [updateField],
  )

  const archiveField = useCallback(
    (fieldId: string) => {
      setDraftFields((prev) => {
        const target = prev.find((f) => f.id === fieldId)
        if (!target) return prev
        if (target.isNew) {
          return prev.filter((f) => f.id !== fieldId)
        }
        return prev.map((f) =>
          f.id === fieldId
            ? { ...f, status: 'archived', required: false, isDirty: true }
            : f,
        )
      })
      if (selectedFieldId === fieldId) setSelectedFieldId(null)
    },
    [selectedFieldId],
  )

  const restoreField = useCallback((fieldId: string) => {
    setDraftFields((prev) =>
      prev.map((f) =>
        f.id === fieldId ? { ...f, status: 'active', isDirty: true } : f,
      ),
    )
  }, [])

  const selectField = useCallback((fieldId: string | null) => {
    setSelectedFieldId(fieldId)
  }, [])

  const toggleShowArchived = useCallback(() => {
    setShowArchived((v) => !v)
  }, [])

  const visibleFields = useMemo(
    () =>
      showArchived
        ? draftFields
        : draftFields.filter((f) => f.status === 'active'),
    [draftFields, showArchived],
  )

  const fields: FieldWithMeta[] = useMemo(
    () =>
      visibleFields.map((field) => ({
        ...field,
        isFocused: selectedFieldId === field.id,
      })),
    [visibleFields, selectedFieldId],
  )

  const fieldCount = useMemo(
    () => draftFields.filter((f) => f.status === 'active').length,
    [draftFields],
  )

  const archivedFieldCount = useMemo(
    () => draftFields.filter((f) => f.status === 'archived').length,
    [draftFields],
  )

  const isDirty = useMemo(() => {
    if (draftDisplayName !== originalDisplayName) return true
    if (draftFields.some((f) => f.isNew || f.isDirty)) return true
    if (draftFields.length !== originalFields.length) return true
    return false
  }, [draftDisplayName, originalDisplayName, draftFields, originalFields])

  const saveSchema = useCallback(async () => {
    if (!selectedSchemaId || !isDirty) return
    setSaveError(null)

    const creates: IBatchFieldCreate[] = []
    const updates: IBatchFieldUpdate[] = []
    const archives: string[] = []

    for (const field of draftFields) {
      if (field.isNew) {
        if (!isValidFieldKey(field.key)) {
          setSaveError(t('validation.keyFormat'))
          return
        }
        creates.push({
          key: field.key,
          display_name: field.displayName,
          type: FIELD_TYPE_TO_DB[field.type],
          required: field.required,
          metadata: nodeToMetadata(field),
        })
        continue
      }

      const original = originalFields.find((o) => o.id === field.id)
      if (!original) continue

      const wasArchived = original.status === 'archived'
      const isArchived = field.status === 'archived'

      if (!wasArchived && isArchived) {
        archives.push(field.id)
        continue
      }

      if (!nodesEqual(field, original)) {
        updates.push({
          id: field.id,
          display_name: field.displayName,
          required: field.required,
          metadata: nodeToMetadata(field),
          status: field.status,
        })
      }
    }

    try {
      if (creates.length > 0 || updates.length > 0 || archives.length > 0) {
        const result = await saveDraftMutation.mutateAsync({
          schema_id: selectedSchemaId,
          creates,
          updates,
          archives,
        })
        const fresh = result.data.map(dtoToNode)
        setOriginalFields(fresh)
        setDraftFields(fresh)
      }

      if (draftDisplayName.trim() !== originalDisplayName) {
        await updateSchemaMutation.mutateAsync({
          id: selectedSchemaId,
          display_name: draftDisplayName.trim(),
        })
        setOriginalDisplayName(draftDisplayName.trim())
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t('validation.saveFailed'),
      )
    }
  }, [
    draftDisplayName,
    draftFields,
    isDirty,
    originalDisplayName,
    originalFields,
    saveDraftMutation,
    selectedSchemaId,
    t,
    updateSchemaMutation,
  ])

  const cancelEdit = useCallback(() => {
    setDraftFields(originalFields)
    setDraftDisplayName(originalDisplayName)
    setSaveError(null)
  }, [originalDisplayName, originalFields])

  const selectedSchema: SchemaDefinition | null = useMemo(() => {
    if (!selectedSchemaDto) return null
    return {
      id: selectedSchemaDto.id,
      key: selectedSchemaDto.key,
      displayName: draftDisplayName,
      status: selectedSchemaDto.status,
      fields: draftFields,
    }
  }, [selectedSchemaDto, draftDisplayName, draftFields])

  useEffect(() => {
    setNavbarExtra({
      component: createElement(SchemaExtraComponent, {
        t,
        search,
        canCreate,
        onSearchChange: setSearch,
        onAddSchema: addSchema,
      }),
    })
    return () => setNavbarExtra({ component: undefined })
  }, [addSchema, canCreate, search, setNavbarExtra, setSearch, t])

  return {
    t,
    search,
    setSearch,
    rows,
    isLoading: schemasQuery.isLoading,
    hasNoProject: !selectedProjectId,
    canRead,
    canCreate,
    canUpdate,
    canArchive,
    canCreateFields,
    canUpdateFields,
    canArchiveFields,

    selectedSchema,
    fields,
    fieldCount,
    archivedFieldCount,
    isFieldsLoading: fieldsQuery.isLoading,
    isDirty,
    isSaving: saveDraftMutation.isPending || updateSchemaMutation.isPending,
    showArchived,
    toggleShowArchived,
    selectedFieldId,

    openSchema,
    closeSchema,

    addSchema,
    createSchemaOpen,
    closeCreateSchema,
    submitCreateSchema,
    isCreatingSchema: createSchemaMutation.isPending,
    createSchemaError,

    archiveSchema,
    updateSchemaDisplayName,

    addField,
    archiveField,
    restoreField,
    updateFieldDisplayName,
    updateFieldKey,
    updateFieldRequired,
    updateFieldDescription,
    updateFieldType,
    updateEnumValues,
    updateNumberRange,
    updateItemType,
    selectField,

    saveSchema,
    cancelEdit,
    saveError,
  }
}

export { isTempId }
export default useSchemaService
