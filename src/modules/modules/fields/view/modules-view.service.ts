import type React from 'react'
import { useMemo, useState } from 'react'

import type {
  ModuleComponent,
  ModuleSchemaDefinition,
  ModuleVisualizationDefinition,
  ModuleVisualizationType,
} from '../../modules.interface'
import type { ModulesViewProps } from './modules-view.component'

const seededNumber = (seed: string, index: number) => {
  const hash = seed
    .split('')
    .reduce(
      (acc, char, position) => acc + char.charCodeAt(0) * (position + 1),
      0,
    )
  return ((hash * (index + 3)) % 60) + 8
}

const buildDate = (index: number) => {
  const now = Date.now()
  return new Date(now - index * 1000 * 60 * 180)
}

const buildTimeSeries = (seed: string, withCategory?: string, points = 10) =>
  Array.from({ length: points }).map((_, index) => ({
    date: buildDate(points - index),
    value: seededNumber(seed, index),
    category: withCategory,
  }))

const buildCategoryData = (seed: string, label?: string) => {
  const categories = label
    ? [label, `${label} B`, `${label} C`]
    : ['Segment A', 'Segment B', 'Segment C']

  return categories.map((category, index) => ({
    name: category,
    value: seededNumber(seed, index),
  }))
}

const buildScatter = (seed: string, label?: string) =>
  Array.from({ length: 9 }).map((_, index) => ({
    x: seededNumber(seed, index),
    y: seededNumber(seed, index + 4),
    size: seededNumber(seed, index + 2) / 2,
    category: label ?? 'Series',
  }))

const buildHeatmap = (seed: string, label?: string) => {
  const xBuckets = label
    ? [label, `${label} B`, `${label} C`]
    : ['North', 'West', 'East']
  const yBuckets = ['Morning', 'Afternoon', 'Evening', 'Night']

  return xBuckets.flatMap((x, xIndex) =>
    yBuckets.map((y, yIndex) => ({
      x,
      y,
      value: seededNumber(seed, xIndex + yIndex),
    })),
  )
}

const buildTimeline = (seed: string, label?: string) =>
  Array.from({ length: 5 }).map((_, index) => {
    const start = buildDate(index * 2)
    const end = new Date(start.getTime() + 1000 * 60 * 90)

    return {
      name: label ? `${label} ${index + 1}` : `Item ${index + 1}`,
      start,
      end,
      category: index % 2 === 0 ? 'active' : 'idle',
    }
  })

export interface ViewItem {
  component: ModuleComponent
  schemaName?: string
  visualizationLabel?: string
  preview: {
    kind: ModuleVisualizationType
    payload: unknown
  } | null
}

const getFieldLabel = (
  schemas: Record<string, ModuleSchemaDefinition>,
  schemaId: string,
  key: string,
) => schemas[schemaId]?.fields.find((field) => field.key === key)?.label

const buildPreviewPayload = (
  component: ModuleComponent,
  schemas: Record<string, ModuleSchemaDefinition>,
): ViewItem['preview'] => {
  const fieldLabel = (key: string | null | undefined) =>
    key && component.schemaId
      ? getFieldLabel(schemas, component.schemaId, key)
      : undefined

  const categoryBinding = component.bindings.find(
    (binding) => binding.inputId === 'category',
  )
  const categoryLabel = fieldLabel(categoryBinding?.fieldKey) ?? undefined

  switch (component.visualization) {
    case 'line':
    case 'area':
    case 'histogram':
      return {
        kind: component.visualization,
        payload: buildTimeSeries(component.id, categoryLabel),
      }
    case 'bar':
    case 'stackedBar': {
      const data = buildTimeSeries(component.id, categoryLabel)
      return { kind: component.visualization, payload: data }
    }
    case 'pie':
    case 'donut': {
      const data = buildCategoryData(component.id, categoryLabel)
      return { kind: component.visualization, payload: data }
    }
    case 'scatter':
      return {
        kind: component.visualization,
        payload: buildScatter(component.id, categoryLabel),
      }
    case 'heatmap':
      return {
        kind: component.visualization,
        payload: buildHeatmap(component.id, categoryLabel),
      }
    case 'timeline':
      return {
        kind: component.visualization,
        payload: buildTimeline(component.id, categoryLabel),
      }
    default:
      return null
  }
}

export const useModulesViewService = (
  props: ModulesViewProps,
): {
  items: ViewItem[]
  draggingId: string | null
  handleDragStart: (id: string) => void
  handleDrop: (id: string) => void
  handleDragOver: (event: React.DragEvent<HTMLElement>) => void
  handleDragEnd: () => void
} => {
  const schemaLookup = useMemo(
    () =>
      props.schemas.reduce<Record<string, ModuleSchemaDefinition>>(
        (acc, schema) => {
          acc[schema.id] = schema
          return acc
        },
        {},
      ),
    [props.schemas],
  )

  const visualizationLookup = useMemo(
    () =>
      props.visualizations.reduce<
        Record<string, ModuleVisualizationDefinition>
      >((acc, item) => {
        acc[item.id] = item
        return acc
      }, {}),
    [props.visualizations],
  )

  const items = useMemo<ViewItem[]>(
    () =>
      props.components.map((component) => ({
        component,
        schemaName: schemaLookup[component.schemaId]?.name,
        visualizationLabel: visualizationLookup[component.visualization]?.label,
        preview: buildPreviewPayload(component, schemaLookup),
      })),
    [props.components, schemaLookup, visualizationLookup],
  )

  const [draggingId, setDraggingId] = useState<string | null>(null)

  const handleDragStart = (id: string) => {
    if (!props.reorderEnabled) return
    setDraggingId(id)
  }

  const handleDrop = (targetId: string) => {
    if (!props.reorderEnabled || !draggingId || draggingId === targetId) return
    props.onReorder(draggingId, targetId)
    setDraggingId(null)
  }

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (props.reorderEnabled) {
      event.preventDefault()
    }
  }

  const handleDragEnd = () => setDraggingId(null)

  return {
    items,
    draggingId,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleDragEnd,
  }
}
