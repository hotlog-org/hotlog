'use client'

import {
  createElement,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslations } from 'next-intl'

import { useDashboardNavbarExtra } from '@/shared/store/dashboard-navbar-extra.store'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useUserPermissions } from '@/shared/api/user-permission'
import {
  type IEventDto,
  type IEventFieldFilter,
  type IFieldDto,
  type ProjectFieldType,
} from '@/shared/api/interface'
import {
  useDeleteEventsMutation,
  useEventsInfiniteQuery,
} from '@/shared/api/event'
import { useSchemaFieldsQuery, useSchemasQuery } from '@/shared/api/schema'

import {
  type EventRecord,
  type EventRow,
  type EventSchema,
  type FieldType,
  type SchemaField,
} from './mock-data'
import { EventsExtraComponent } from './events-extra.component'

export type SchemaOption = EventSchema
export type TFunction = ReturnType<typeof useTranslations>

export interface FieldFilter {
  schemaId: string
  fieldKey: string
  value: string
}

export interface EventFilters {
  query: string
  selectedSchemas: string[]
  fieldFilters: FieldFilter[]
}

export interface EventsService {
  t: TFunction
  filters: EventFilters
  setQuery: (value: string) => void
  addSchema: (schemaId: string) => void
  removeSchema: (schemaId: string) => void
  selectedSchemas: string[]
  upsertFieldFilter: (schemaId: string, fieldKey: string, value: string) => void
  removeFieldFilter: (schemaId: string, fieldKey: string) => void
  resetFilters: () => void
  rows: EventRow[]
  schemas: SchemaOption[]
  selectedEvent: EventRecord | null
  selectedSchema: EventSchema | null
  openEvent: (id: string) => void
  closeDrawer: () => void
  drawerOpen: boolean
  hasNoProject: boolean
  canRead: boolean
  canDelete: boolean
  isLoading: boolean
  isError: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  loadMore: () => void
  // Selection + delete
  selectedIds: Set<string>
  selectedCount: number
  toggleRowSelection: (id: string, selected: boolean) => void
  toggleManySelection: (ids: string[], selected: boolean) => void
  clearSelection: () => void
  // Delete confirmation dialog
  pendingDeleteIds: number[] | null
  requestDelete: (ids: number[]) => void
  cancelDelete: () => void
  confirmDelete: () => void
  isDeleting: boolean
  deleteError: string | null
  filterMenu: {
    open: boolean
    step: 'schema' | 'field' | 'value'
    draftSchemaId: string | null
    draftFieldKey: string | null
    draftValue: string
    schemas: SchemaOption[]
    schemaHasFilters: (schemaId: string) => boolean
    fields: { field: SchemaField; hasFilter: boolean }[]
    openChange: (open: boolean) => void
    selectSchema: (schemaId: string) => void
    selectField: (fieldKey: string) => void
    setDraftValue: (value: string) => void
    back: () => void
    apply: () => void
    clearAll: () => void
  }
  appliedFilters: FieldFilter[]
}

const FIELD_TYPE_MAP: Record<ProjectFieldType, FieldType> = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATETIME: 'datetime',
  ARRAY: 'array',
  JSON: 'json',
  ENUM: 'enum',
}

const fieldDtoToSchemaField = (dto: IFieldDto): SchemaField => ({
  key: dto.key,
  label: dto.displayName,
  type: FIELD_TYPE_MAP[dto.type],
  description: dto.metadata?.description,
  enumValues: dto.metadata?.enumValues,
})

const eventDtoToRecord = (dto: IEventDto): EventRecord => ({
  id: String(dto.id),
  title: `${dto.schemaDisplayName || dto.schemaKey} · #${dto.id}`,
  schemaId: dto.schemaId,
  source: 'api',
  status: 'ingested',
  createdAt: dto.createdAt,
  payload: dto.value,
})

const useEventsService = (): EventsService => {
  const t = useTranslations('modules.dashboard.events')
  const selectedProjectId = useDashboardProject((s) => s.selectedProjectId)
  const { can } = useUserPermissions(selectedProjectId)
  const canRead = can('read:events')
  const canDelete = can('delete:events')

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([])
  const [fieldFilters, setFieldFilters] = useState<FieldFilter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[] | null>(
    null,
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deleteEventsMutation = useDeleteEventsMutation(selectedProjectId)

  const schemasQuery = useSchemasQuery(canRead ? selectedProjectId : undefined)

  const schemas: SchemaOption[] = useMemo(() => {
    const list = schemasQuery.data?.data ?? []
    return list.map((s) => ({
      id: s.id,
      name: s.displayName,
      version: '',
      fields: [],
    }))
  }, [schemasQuery.data])

  const apiFieldFilters: IEventFieldFilter[] = useMemo(
    () =>
      fieldFilters.map((f) => ({
        schema_id: f.schemaId,
        field_key: f.fieldKey,
        value: f.value,
      })),
    [fieldFilters],
  )

  const eventsQuery = useEventsInfiniteQuery({
    projectId: canRead ? selectedProjectId : undefined,
    schemas: selectedSchemas,
    search: deferredQuery,
    fieldFilters: apiFieldFilters,
  })

  const flatEvents: IEventDto[] = useMemo(
    () => eventsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [eventsQuery.data],
  )

  const schemaNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of schemas) map.set(s.id, s.name)
    return map
  }, [schemas])

  const rows: EventRow[] = useMemo(
    () =>
      flatEvents.map((event) => {
        const record = eventDtoToRecord(event)
        return {
          ...record,
          schemaName:
            schemaNameById.get(event.schemaId) ||
            event.schemaDisplayName ||
            t('unknownSchema'),
          schemaVersion: '',
        }
      }),
    [flatEvents, schemaNameById, t],
  )

  // === Filter menu draft state (UX unchanged) =================
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [filterStep, setFilterStep] = useState<'schema' | 'field' | 'value'>(
    'schema',
  )
  const [draftSchemaId, setDraftSchemaId] = useState<string | null>(null)
  const [draftFieldKey, setDraftFieldKey] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')

  // Lazy-load fields for whichever schema the user is browsing in
  // the filter menu so we only fetch when needed.
  const draftFieldsQuery = useSchemaFieldsQuery(draftSchemaId ?? undefined)
  const draftFieldList: SchemaField[] = useMemo(
    () => (draftFieldsQuery.data?.data ?? []).map(fieldDtoToSchemaField),
    [draftFieldsQuery.data],
  )

  const fieldsForDraftSchema: { field: SchemaField; hasFilter: boolean }[] =
    useMemo(() => {
      if (!draftSchemaId) return []
      return draftFieldList.map((field) => ({
        field,
        hasFilter: fieldFilters.some(
          (f) => f.schemaId === draftSchemaId && f.fieldKey === field.key,
        ),
      }))
    }, [draftFieldList, draftSchemaId, fieldFilters])

  const resetDraft = useCallback(() => {
    setDraftSchemaId(null)
    setDraftFieldKey(null)
    setDraftValue('')
    setFilterStep('schema')
  }, [])

  const schemaHasFilters = useCallback(
    (id: string) => fieldFilters.some((f) => f.schemaId === id),
    [fieldFilters],
  )

  const openChange = useCallback(
    (open: boolean) => {
      setFilterMenuOpen(open)
      if (!open) resetDraft()
      if (open) setFilterStep('schema')
    },
    [resetDraft],
  )

  const selectSchema = useCallback((id: string) => {
    setDraftSchemaId(id)
    setFilterStep('field')
  }, [])

  const selectField = useCallback(
    (fieldKey: string) => {
      setDraftFieldKey(fieldKey)
      const existing = fieldFilters.find(
        (f) => f.schemaId === draftSchemaId && f.fieldKey === fieldKey,
      )
      setDraftValue(existing?.value ?? '')
      setFilterStep('value')
    },
    [draftSchemaId, fieldFilters],
  )

  const upsertFieldFilter = useCallback(
    (schema: string, fieldKey: string, value: string) => {
      setFieldFilters((prev) => {
        const existing = prev.find(
          (f) => f.schemaId === schema && f.fieldKey === fieldKey,
        )
        if (existing) {
          return prev.map((f) =>
            f.schemaId === schema && f.fieldKey === fieldKey
              ? { ...f, value }
              : f,
          )
        }
        return [...prev, { schemaId: schema, fieldKey, value }]
      })
    },
    [],
  )

  const removeFieldFilter = useCallback((schema: string, fieldKey: string) => {
    setFieldFilters((prev) =>
      prev.filter((f) => !(f.schemaId === schema && f.fieldKey === fieldKey)),
    )
  }, [])

  const applyFilter = useCallback(() => {
    const value = draftValue.trim()
    if (!draftSchemaId || !draftFieldKey || !value) return
    upsertFieldFilter(draftSchemaId, draftFieldKey, value)
    setFilterStep('field')
  }, [draftFieldKey, draftSchemaId, draftValue, upsertFieldFilter])

  const addSchema = useCallback((id: string) => {
    setSelectedSchemas((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const removeSchema = useCallback((id: string) => {
    setSelectedSchemas((prev) => prev.filter((s) => s !== id))
    setFieldFilters((prev) => prev.filter((f) => f.schemaId !== id))
  }, [])

  const back = useCallback(() => {
    if (filterStep === 'value') {
      setFilterStep('field')
      return
    }
    setFilterStep('schema')
    setDraftFieldKey(null)
  }, [filterStep])

  const clearAll = useCallback(() => {
    setFieldFilters([])
    setSelectedSchemas([])
    resetDraft()
  }, [resetDraft])

  const resetFilters = useCallback(() => {
    setQuery('')
    setSelectedSchemas([])
    setFieldFilters([])
  }, [])

  // === Row selection (for bulk delete) ========================
  const toggleRowSelection = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const toggleManySelection = useCallback(
    (ids: string[], selected: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (selected) ids.forEach((id) => next.add(id))
        else ids.forEach((id) => next.delete(id))
        return next
      })
    },
    [],
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Prune selection of ids that are no longer in the loaded rows so
  // the count stays accurate after a refetch / filter change.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const presentIds = new Set(rows.map((row) => row.id))
      let changed = false
      const next = new Set<string>()
      prev.forEach((id) => {
        if (presentIds.has(id)) next.add(id)
        else changed = true
      })
      return changed ? next : prev
    })
  }, [rows])

  // === Delete confirmation flow ===============================
  const requestDelete = useCallback((ids: number[]) => {
    setDeleteError(null)
    setPendingDeleteIds(ids)
  }, [])

  const cancelDelete = useCallback(() => {
    setPendingDeleteIds(null)
    setDeleteError(null)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!pendingDeleteIds || !selectedProjectId) return
    setDeleteError(null)
    deleteEventsMutation.mutate(
      { projectId: selectedProjectId, ids: pendingDeleteIds },
      {
        onSuccess: () => {
          const deletedSet = new Set(pendingDeleteIds.map(String))
          setSelectedIds((prev) => {
            const next = new Set(prev)
            deletedSet.forEach((id) => next.delete(id))
            return next
          })
          setPendingDeleteIds(null)
          setSelectedId((current) =>
            current && deletedSet.has(current) ? null : current,
          )
        },
        onError: (err) => {
          setDeleteError(
            err instanceof Error ? err.message : t('confirmDelete.failed'),
          )
        },
      },
    )
  }, [deleteEventsMutation, pendingDeleteIds, selectedProjectId, t])

  // === Selected event / drawer ================================
  const openEvent = useCallback((id: string) => setSelectedId(id), [])
  const closeDrawer = useCallback(() => setSelectedId(null), [])

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const selectedSchemaFieldsQuery = useSchemaFieldsQuery(selectedRow?.schemaId)

  const selectedEvent: EventRecord | null = useMemo(() => {
    if (!selectedRow) return null
    const {
      schemaName: _name,
      schemaVersion: _version,
      ...record
    } = selectedRow
    return record
  }, [selectedRow])

  const selectedSchema: EventSchema | null = useMemo(() => {
    if (!selectedRow) return null
    const fields = (selectedSchemaFieldsQuery.data?.data ?? []).map(
      fieldDtoToSchemaField,
    )
    return {
      id: selectedRow.schemaId,
      name: selectedRow.schemaName,
      version: '',
      fields,
    }
  }, [selectedRow, selectedSchemaFieldsQuery.data])

  const filters: EventFilters = {
    query,
    selectedSchemas,
    fieldFilters,
  }

  // === Navbar extra ===========================================
  const setNavbarExtra = useDashboardNavbarExtra(
    (s) => s.handleDashboardNavbarExtra,
  )

  useEffect(() => {
    setNavbarExtra({
      component: createElement(EventsExtraComponent, {
        t,
        query,
        onQueryChange: setQuery,
        filterMenu: {
          open: filterMenuOpen,
          step: filterStep,
          draftSchemaId,
          draftFieldKey,
          draftValue,
          schemas,
          schemaHasFilters,
          fields: fieldsForDraftSchema,
          openChange,
          selectSchema: (id: string) => {
            addSchema(id)
            selectSchema(id)
          },
          selectField,
          setDraftValue,
          back,
          apply: applyFilter,
          clearAll,
        },
        appliedFilters: fieldFilters,
        removeFieldFilter,
      }),
    })

    return () => setNavbarExtra({ component: undefined })
  }, [
    addSchema,
    applyFilter,
    back,
    clearAll,
    draftFieldKey,
    draftSchemaId,
    draftValue,
    fieldFilters,
    fieldsForDraftSchema,
    filterMenuOpen,
    filterStep,
    openChange,
    query,
    removeFieldFilter,
    schemaHasFilters,
    schemas,
    selectField,
    selectSchema,
    setDraftValue,
    setNavbarExtra,
    t,
  ])

  return {
    t,
    filters,
    setQuery,
    upsertFieldFilter,
    removeFieldFilter,
    resetFilters,
    rows,
    schemas,
    addSchema,
    removeSchema,
    selectedSchemas,
    selectedEvent,
    selectedSchema,
    openEvent,
    closeDrawer,
    drawerOpen: Boolean(selectedId),
    hasNoProject: !selectedProjectId,
    canRead,
    canDelete,
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    hasNextPage: Boolean(eventsQuery.hasNextPage),
    isFetchingNextPage: eventsQuery.isFetchingNextPage,
    loadMore: () => {
      if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
        eventsQuery.fetchNextPage()
      }
    },
    selectedIds,
    selectedCount: selectedIds.size,
    toggleRowSelection,
    toggleManySelection,
    clearSelection,
    pendingDeleteIds,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting: deleteEventsMutation.isPending,
    deleteError,
    filterMenu: {
      open: filterMenuOpen,
      step: filterStep,
      draftSchemaId,
      draftFieldKey,
      draftValue,
      schemas,
      schemaHasFilters,
      fields: fieldsForDraftSchema,
      openChange,
      selectSchema,
      selectField,
      setDraftValue,
      back,
      apply: applyFilter,
      clearAll,
    },
    appliedFilters: fieldFilters,
  }
}

export default useEventsService
