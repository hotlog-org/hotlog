import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { useDashboardNavbarExtra } from '@/shared/store/dashboard-navbar-extra.store'
import { fetchEventSchemas, fetchEvents } from './events.api'
import { type EventSchema } from '@/lib/events/events.contract'
import type {
  EventListQuery,
  EventRecord,
  EventRow,
} from '@/lib/events/events.contract'
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
  stats: {
    total: number
    filtered: number
    schemas: number
  }
  filterMenu: {
    open: boolean
    step: 'schema' | 'field' | 'value'
    draftSchemaId: string | null
    draftFieldKey: string | null
    draftValue: string
    schemas: SchemaOption[]
    schemaHasFilters: (schemaId: string) => boolean
    fields: { field: EventSchema['fields'][number]; hasFilter: boolean }[]
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

const useEventsService = (): EventsService => {
  const t = useTranslations('modules.dashboard.events')
  const [query, setQuery] = useState('')
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([])
  const [fieldFilters, setFieldFilters] = useState<FieldFilter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const eventFilters = useMemo<EventListQuery>(
    () => ({
      search: query,
      schemaIds: selectedSchemas,
      limit: 200,
      offset: 0,
    }),
    [query, selectedSchemas],
  )

  const eventsQuery = useQuery({
    queryKey: ['events.list', eventFilters],
    queryFn: () => fetchEvents(eventFilters),
  })

  const schemasQuery = useQuery({
    queryKey: ['events.schemas'],
    queryFn: fetchEventSchemas,
  })

  const eventRecords = eventsQuery.data?.items ?? []
  const schemas = schemasQuery.data ?? []

  const schemaMap = useMemo(
    () => new Map(schemas.map((schema) => [schema.id, schema])),
    [schemas],
  )

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return eventRecords
      .filter((event) => {
        const matchingSchemaFilters = fieldFilters.filter(
          (f) => f.schemaId === event.schemaId,
        )
        const matchesFieldFilters = matchingSchemaFilters.every((filter) => {
          const value = (event.payload ?? {})[filter.fieldKey]
          if (value === undefined || value === null) return false
          const normalizedValue =
            typeof value === 'object'
              ? JSON.stringify(value).toLowerCase()
              : String(value).toLowerCase()
          return normalizedValue.includes(filter.value.toLowerCase())
        })

        if (!matchesFieldFilters) return false

        if (
          selectedSchemas.length > 0 &&
          !selectedSchemas.includes(event.schemaId)
        ) {
          return false
        }

        if (!normalizedQuery) return true

        const schema = schemaMap.get(event.schemaId)
        const matchesTitle = event.title.toLowerCase().includes(normalizedQuery)
        const matchesSchema = schema?.name
          .toLowerCase()
          .includes(normalizedQuery)
        const matchesPayload = JSON.stringify(event.payload)
          .toLowerCase()
          .includes(normalizedQuery)

        return matchesTitle || matchesSchema || matchesPayload
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }, [fieldFilters, query, selectedSchemas, schemaMap])

  const rows: EventRow[] = useMemo(
    () =>
      filteredEvents.map((event) => {
        const schema = schemaMap.get(event.schemaId)
        return {
          ...event,
          schemaName: schema?.name ?? t('unknownSchema'),
          schemaVersion: schema?.version ?? t('fields.empty'),
        }
      }),
    [filteredEvents, schemaMap, t],
  )

  const selectedEvent = useMemo(
    () => eventRecords.find((event) => event.id === selectedId) ?? null,
    [selectedId],
  )

  const selectedSchema = useMemo(
    () =>
      selectedEvent ? (schemaMap.get(selectedEvent.schemaId) ?? null) : null,
    [schemaMap, selectedEvent],
  )

  const openEvent = useCallback((id: string) => setSelectedId(id), [])
  const closeDrawer = useCallback(() => setSelectedId(null), [])

  const resetFilters = useCallback(() => {
    setQuery('')
    setSelectedSchemas([])
    setFieldFilters([])
  }, [])

  const stats = useMemo(
    () => ({
      total: eventsQuery.data?.total ?? eventRecords.length,
      filtered: filteredEvents.length,
      schemas: schemas.length,
    }),
    [
      eventFilters,
      filteredEvents.length,
      eventsQuery.data?.total,
      schemas.length,
    ],
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

  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [filterStep, setFilterStep] = useState<'schema' | 'field' | 'value'>(
    'schema',
  )
  const [draftSchemaId, setDraftSchemaId] = useState<string | null>(null)
  const [draftFieldKey, setDraftFieldKey] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')

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

  const fieldsForDraftSchema: {
    field: EventSchema['fields'][number]
    hasFilter: boolean
  }[] = useMemo(() => {
    if (!draftSchemaId) return []
    const draftSchema = schemaMap.get(draftSchemaId)
    if (!draftSchema) return []
    return draftSchema.fields.map((field) => ({
      field,
      hasFilter: fieldFilters.some(
        (f) => f.schemaId === draftSchemaId && f.fieldKey === field.key,
      ),
    }))
  }, [draftSchemaId, fieldFilters, schemaMap])

  const filters: EventFilters = {
    query,
    selectedSchemas,
    fieldFilters,
  }

  const useExtra = useDashboardNavbarExtra((s) => s.handleDashboardNavbarExtra)

  useEffect(() => {
    useExtra({
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

    return () => useExtra({ component: undefined })
  }, [
    applyFilter,
    back,
    clearAll,
    fieldFilters,
    fieldsForDraftSchema,
    filterMenuOpen,
    filterStep,
    openChange,
    query,
    removeFieldFilter,
    schemaHasFilters,
    addSchema,
    draftSchemaId,
    draftFieldKey,
    draftValue,
    setQuery,
    stats,
    t,
    useExtra,
    selectSchema,
    selectField,
    setDraftValue,
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
    stats,
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
