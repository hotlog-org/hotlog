import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useDashboardNavbarExtra } from '@/shared/store/dashboard-navbar-extra.store'

import {
  eventRecords,
  eventSchemas,
  type EventRecord,
  type EventRow,
  type EventSchema,
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
  schemaId: 'all' | string
  fieldFilters: FieldFilter[]
}

export interface EventsService {
  t: TFunction
  filters: EventFilters
  setQuery: (value: string) => void
  setSchemaId: (schemaId: EventFilters['schemaId']) => void
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
  const [schemaId, setSchemaId] = useState<EventFilters['schemaId']>('all')
  const [fieldFilters, setFieldFilters] = useState<FieldFilter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const schemaMap = useMemo(
    () => new Map(eventSchemas.map((schema) => [schema.id, schema])),
    [],
  )

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return eventRecords
      .filter((event) => {
        if (schemaId !== 'all' && event.schemaId !== schemaId) return false

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
  }, [fieldFilters, query, schemaId, schemaMap])

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
    setSchemaId('all')
    setFieldFilters([])
  }, [])

  const stats = useMemo(
    () => ({
      total: eventRecords.length,
      filtered: filteredEvents.length,
      schemas: eventSchemas.length,
    }),
    [filteredEvents.length],
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
    setSchemaId(id)
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
    setSchemaId('all')
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
    schemaId,
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
          schemas: eventSchemas,
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
    setSchemaId,
    upsertFieldFilter,
    removeFieldFilter,
    resetFilters,
    rows,
    schemas: eventSchemas,
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
      schemas: eventSchemas,
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
