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
import { useQueries } from '@tanstack/react-query'

import { useDashboardNavbarExtra } from '@/shared/store/dashboard-navbar-extra.store'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useUserPermissions } from '@/shared/api/user-permission'
import {
  type IEventDto,
  type IEventFieldFilter,
  type IFieldDto,
  type ProjectFieldType,
  ESchemaKey,
} from '@/shared/api/interface'
import {
  useDeleteEventsMutation,
  useEventsInfiniteQuery,
} from '@/shared/api/event'
import { schemaFieldsQueryApi, useSchemasQuery } from '@/shared/api/schema'

import {
  type EventRecord,
  type EventRow,
  type EventSchema,
  type FieldType,
  type SchemaField,
} from './mock-data'
import {
  makeFilterId,
  type ParsedFieldFilter,
} from './fields/filter/filter-parser'
import { formatClausesToText } from './fields/filter/value-clause-parser'
import { EventsExtraComponent } from './events-extra.component'

export type SchemaOption = EventSchema
export type TFunction = ReturnType<typeof useTranslations>

// The local FieldFilter is a thin alias around ParsedFieldFilter — same
// shape, just renamed for the rest of the events module.
export type FieldFilter = ParsedFieldFilter

export interface EventFilters {
  query: string
  selectedSchemas: string[]
  fieldFilters: FieldFilter[]
}

export interface FilterMenuState {
  open: boolean
  step: 'schema' | 'field' | 'value'
  draftSchemaId: string | null
  draftSchemaName: string | null
  draftField: SchemaField | null
  fields: { field: SchemaField; hasFilter: boolean }[]
  schemas: SchemaOption[]
  schemaHasFilters: (schemaId: string) => boolean
  // Canonical text reconstruction of the filters that already exist
  // on the currently-selected (schemaId, fieldKey) pair. Used to
  // pre-populate the value-step input on reopen so the user can
  // edit existing filters in place.
  initialValueText: string
  openChange: (open: boolean) => void
  selectSchema: (schemaId: string) => void
  selectField: (fieldKey: string) => void
  back: () => void
  clearAll: () => void
  // Called when the user clicks Apply at the value step. Replaces all
  // existing filters on the chosen (schemaId, fieldKey) with the new
  // ones — passing an empty array clears the field's filters entirely.
  applyClauses: (
    clauses: {
      operator: FieldFilter['operator']
      values: string[]
      quantifier?: FieldFilter['quantifier']
      keyPath?: FieldFilter['keyPath']
    }[],
  ) => void
}

export interface EventsService {
  t: TFunction
  filters: EventFilters
  setQuery: (value: string) => void
  addSchema: (schemaId: string) => void
  removeSchema: (schemaId: string) => void
  selectedSchemas: string[]
  fieldFilters: FieldFilter[]
  removeFieldFilter: (id: string) => void
  clearFieldFilters: () => void
  // Open the filter popover directly at the value step for an
  // existing (schemaId, fieldKey) pair so the user can edit it
  // without manually navigating the schema/field menus.
  editFieldFilters: (schemaId: string, fieldKey: string) => void
  resetFilters: () => void
  filterMenu: FilterMenuState
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

const filterToWire = (filter: FieldFilter): IEventFieldFilter => ({
  schema_id: filter.schemaId,
  field_key: filter.fieldKey,
  field_type: FIELD_TYPE_MAP_REVERSE[filter.fieldType],
  operator: filter.operator,
  values: filter.values,
  quantifier: filter.quantifier,
  key_path: filter.keyPath,
})

const FIELD_TYPE_MAP_REVERSE: Record<FieldType, ProjectFieldType> = {
  string: 'STRING',
  number: 'NUMBER',
  boolean: 'BOOLEAN',
  datetime: 'DATETIME',
  array: 'ARRAY',
  json: 'JSON',
  enum: 'ENUM',
}

const useEventsService = (): EventsService => {
  const t = useTranslations('modules.dashboard.events')
  const selectedProjectId = useDashboardProject((s) => s.selectedProjectId)
  const { can } = useUserPermissions(selectedProjectId)
  const canRead = can('read:events')
  const canDelete = can('delete:events')

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([])
  const [fieldFilters, setFieldFiltersState] = useState<FieldFilter[]>([])
  // Popover draft state
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [filterStep, setFilterStep] = useState<'schema' | 'field' | 'value'>(
    'schema',
  )
  const [draftSchemaId, setDraftSchemaId] = useState<string | null>(null)
  const [draftFieldKey, setDraftFieldKey] = useState<string | null>(null)
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

  // Fan out: fetch active fields for every schema in the project so the
  // filter parser can resolve identifiers across all schemas. Each query
  // is cached individually and shared with the detail drawer's per-schema
  // fetch, so we don't double-fetch.
  const schemaList = schemasQuery.data?.data ?? []
  const fieldQueries = useQueries({
    queries: schemaList.map((s) => ({
      queryKey: [
        ESchemaKey.SCHEMA_FIELDS_QUERY,
        s.id,
        { includeArchived: false },
      ],
      queryFn: (opt: { signal: AbortSignal }) =>
        schemaFieldsQueryApi(s.id, false, {
          signal: opt.signal,
        } as Parameters<typeof schemaFieldsQueryApi>[2]),
      enabled: Boolean(canRead && selectedProjectId),
      staleTime: 1000 * 60,
    })),
  })

  // Map schemaId -> active fields. Used by the popover field step and
  // by the detail drawer (so we don't double-fetch the same schemas).
  const fieldsBySchemaId: Map<string, IFieldDto[]> = useMemo(() => {
    const m = new Map<string, IFieldDto[]>()
    schemaList.forEach((s, i) => {
      const fieldsResp = fieldQueries[i]?.data
      m.set(s.id, fieldsResp?.data ?? [])
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaList, ...fieldQueries.map((q) => q.data)])

  const apiFieldFilters: IEventFieldFilter[] = useMemo(
    () => fieldFilters.map(filterToWire),
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

  // === Filter list management ================================
  const removeFieldFilter = useCallback((id: string) => {
    setFieldFiltersState((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const clearFieldFilters = useCallback(() => {
    setFieldFiltersState([])
  }, [])

  const addSchema = useCallback((id: string) => {
    setSelectedSchemas((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const removeSchema = useCallback((id: string) => {
    setSelectedSchemas((prev) => prev.filter((s) => s !== id))
    setFieldFiltersState((prev) => prev.filter((f) => f.schemaId !== id))
  }, [])

  const resetFilters = useCallback(() => {
    setQuery('')
    setSelectedSchemas([])
    setFieldFiltersState([])
  }, [])

  // === Popover state machine ==================================
  const draftSchema = useMemo(
    () => schemaList.find((s) => s.id === draftSchemaId) ?? null,
    [draftSchemaId, schemaList],
  )

  const draftFieldList: SchemaField[] = useMemo(
    () =>
      draftSchemaId
        ? (fieldsBySchemaId.get(draftSchemaId) ?? []).map(fieldDtoToSchemaField)
        : [],
    [draftSchemaId, fieldsBySchemaId],
  )

  const fieldsForDraftSchema = useMemo(
    () =>
      draftFieldList.map((field) => ({
        field,
        hasFilter: fieldFilters.some(
          (f) => f.schemaId === draftSchemaId && f.fieldKey === field.key,
        ),
      })),
    [draftFieldList, draftSchemaId, fieldFilters],
  )

  const draftField = useMemo(
    () =>
      draftFieldKey
        ? (draftFieldList.find((f) => f.key === draftFieldKey) ?? null)
        : null,
    [draftFieldKey, draftFieldList],
  )

  // Reconstruct the canonical text form of any existing filters on the
  // current draft (schemaId, fieldKey) so the value-step input can be
  // pre-populated for editing.
  const initialValueText = useMemo(() => {
    if (!draftSchemaId || !draftFieldKey) return ''
    const existing = fieldFilters.filter(
      (f) => f.schemaId === draftSchemaId && f.fieldKey === draftFieldKey,
    )
    if (existing.length === 0) return ''
    return formatClausesToText(existing)
  }, [fieldFilters, draftSchemaId, draftFieldKey])

  const schemaHasFilters = useCallback(
    (id: string) => fieldFilters.some((f) => f.schemaId === id),
    [fieldFilters],
  )

  const resetDraft = useCallback(() => {
    setDraftSchemaId(null)
    setDraftFieldKey(null)
    setFilterStep('schema')
  }, [])

  const openChange = useCallback(
    (open: boolean) => {
      setFilterMenuOpen(open)
      if (!open) resetDraft()
      else setFilterStep('schema')
    },
    [resetDraft],
  )

  const selectSchemaInMenu = useCallback((id: string) => {
    setDraftSchemaId(id)
    setFilterStep('field')
  }, [])

  const selectFieldInMenu = useCallback((fieldKey: string) => {
    setDraftFieldKey(fieldKey)
    setFilterStep('value')
  }, [])

  // Fast-navigation: open the popover straight at the value step for
  // an existing (schemaId, fieldKey). Used when the user clicks on a
  // chip in the strip above the table.
  const editFieldFilters = useCallback(
    (schemaId: string, fieldKey: string) => {
      setDraftSchemaId(schemaId)
      setDraftFieldKey(fieldKey)
      setFilterStep('value')
      setFilterMenuOpen(true)
    },
    [],
  )

  const back = useCallback(() => {
    if (filterStep === 'value') {
      setFilterStep('field')
      setDraftFieldKey(null)
      return
    }
    setFilterStep('schema')
    setDraftSchemaId(null)
  }, [filterStep])

  const clearAll = useCallback(() => {
    setFieldFiltersState([])
    setSelectedSchemas([])
    resetDraft()
  }, [resetDraft])

  const applyClauses = useCallback(
    (
      clauses: {
        operator: FieldFilter['operator']
        values: string[]
        quantifier?: FieldFilter['quantifier']
        keyPath?: FieldFilter['keyPath']
      }[],
    ) => {
      if (!draftSchema || !draftField) return
      const newFilters: FieldFilter[] = clauses.map((c) => ({
        id: makeFilterId(),
        schemaId: draftSchema.id,
        schemaKey: draftSchema.key,
        schemaDisplayName: draftSchema.displayName,
        fieldKey: draftField.key,
        fieldType: draftField.type,
        operator: c.operator,
        values: c.values,
        quantifier: c.quantifier,
        keyPath: c.keyPath,
      }))
      // Replace any existing filters on this (schemaId, fieldKey) with
      // the new ones. Passing an empty `clauses` array clears the
      // field's filters entirely (the user emptied the input).
      setFieldFiltersState((prev) => [
        ...prev.filter(
          (f) =>
            !(f.schemaId === draftSchema.id && f.fieldKey === draftField.key),
        ),
        ...newFilters,
      ])
      setFilterMenuOpen(false)
      resetDraft()
    },
    [draftField, draftSchema, resetDraft],
  )

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

  // The detail drawer needs the selected schema's fields. We already
  // fetch fields for every schema via parserSchemas, so reuse that
  // instead of firing another query.
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
    const matchedFields = fieldsBySchemaId.get(selectedRow.schemaId) ?? []
    const fields = matchedFields.map(fieldDtoToSchemaField)
    return {
      id: selectedRow.schemaId,
      name: selectedRow.schemaName,
      version: '',
      fields,
    }
  }, [selectedRow, fieldsBySchemaId])

  const filters: EventFilters = {
    query,
    selectedSchemas,
    fieldFilters,
  }

  // === Navbar extra ===========================================
  const setNavbarExtra = useDashboardNavbarExtra(
    (s) => s.handleDashboardNavbarExtra,
  )

  const filterMenu: FilterMenuState = {
    open: filterMenuOpen,
    step: filterStep,
    draftSchemaId,
    draftSchemaName: draftSchema?.displayName ?? null,
    draftField,
    fields: fieldsForDraftSchema,
    schemas,
    schemaHasFilters,
    initialValueText,
    openChange,
    selectSchema: selectSchemaInMenu,
    selectField: selectFieldInMenu,
    back,
    clearAll,
    applyClauses,
  }

  useEffect(() => {
    setNavbarExtra({
      component: createElement(EventsExtraComponent, {
        t,
        query,
        onQueryChange: setQuery,
        filterMenu,
      }),
    })

    return () => setNavbarExtra({ component: undefined })
  }, [filterMenu, query, setNavbarExtra, t])

  return {
    t,
    filters,
    setQuery,
    resetFilters,
    rows,
    schemas,
    addSchema,
    removeSchema,
    selectedSchemas,
    fieldFilters,
    removeFieldFilter,
    clearFieldFilters,
    filterMenu,
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
  }
}

export default useEventsService
