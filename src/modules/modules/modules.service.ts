'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { moduleSchemas, modulesMock } from './mock-data'
import type {
  ModuleBinding,
  ModuleComponent,
  ModuleDefinition,
  ModuleSchemaDefinition,
  ModuleVisualizationDefinition,
  ModuleVisualizationInput,
  ModuleVisualizationType,
  TFunction,
} from './modules.interface'
import { useModulesStore } from './modules.store'

const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`

const cloneModule = (module: ModuleDefinition): ModuleDefinition =>
  structuredClone(module)

const normalizeBindings = (
  bindings: ModuleBinding[],
  inputs: ModuleVisualizationInput[],
): ModuleBinding[] =>
  inputs.map((input) => {
    const existing = bindings.find((item) => item.inputId === input.id)
    return { inputId: input.id, fieldKey: existing?.fieldKey ?? null }
  })

interface ModulesServiceParams {
  moduleId?: string
}

export interface ModulesService {
  t: TFunction
  module: ModuleDefinition | null
  schemas: ModuleSchemaDefinition[]
  visualizations: ModuleVisualizationDefinition[]
  isDirty: boolean
  reorderEnabled: boolean
  editor: {
    open: boolean
    mode: 'create' | 'edit'
    component: ModuleComponent | null
  }
  editingField: 'name' | 'heroDescription' | null
  setEditingField: (field: 'name' | 'heroDescription' | null) => void
  setReorderEnabled: (value: boolean) => void
  openCreateComponent: () => void
  openEditComponent: (componentId: string) => void
  closeEditor: () => void
  submitComponent: (component: ModuleComponent) => void
  reorderComponent: (fromId: string, toId: string) => void
  updateName: (value: string) => void
  updateHeroDescription: (value: string) => void
  saveModule: () => void
  cancelChanges: () => void
  selectModule: (id: string) => void
  deleteComponent: (componentId: string) => void
}

export const useModulesService = (
  params: ModulesServiceParams = {},
): ModulesService => {
  const t = useTranslations('modules.dashboard.modules')
  const [draftModule, setDraftModule] = useState<ModuleDefinition | null>(
    modulesMock[0] ? cloneModule(modulesMock[0]) : null,
  )
  const [isDirty, setIsDirty] = useState(false)
  const [reorderEnabled, setReorderEnabled] = useState(false)
  const [editingField, setEditingField] = useState<
    'name' | 'heroDescription' | null
  >(null)
  const [editor, setEditor] = useState<ModulesService['editor']>({
    open: false,
    mode: 'create',
    component: null,
  })

  const { modules, selectedModuleId, setSelectedModuleId, updateModule } =
    useModulesStore()

  const visualizationInputs = useMemo<
    Record<ModuleVisualizationType, ModuleVisualizationInput[]>
  >(
    () => ({
      line: [
        { id: 'timestamp', label: t('inputs.timestamp'), type: 'datetime' },
        { id: 'value', label: t('inputs.value'), type: 'number' },
        {
          id: 'category',
          label: t('inputs.category'),
          type: 'string',
          optional: true,
        },
      ],
      area: [
        { id: 'timestamp', label: t('inputs.timestamp'), type: 'datetime' },
        { id: 'value', label: t('inputs.value'), type: 'number' },
        {
          id: 'category',
          label: t('inputs.category'),
          type: 'string',
          optional: true,
        },
      ],
      bar: [
        { id: 'category', label: t('inputs.category'), type: 'string' },
        { id: 'value', label: t('inputs.value'), type: 'number' },
      ],
      stackedBar: [
        { id: 'category', label: t('inputs.category'), type: 'string' },
        { id: 'value', label: t('inputs.value'), type: 'number' },
      ],
      pie: [
        { id: 'category', label: t('inputs.category'), type: 'string' },
        { id: 'value', label: t('inputs.value'), type: 'number' },
      ],
      donut: [
        { id: 'category', label: t('inputs.category'), type: 'string' },
        { id: 'value', label: t('inputs.value'), type: 'number' },
      ],
      scatter: [
        { id: 'x', label: t('inputs.x'), type: 'number' },
        { id: 'y', label: t('inputs.y'), type: 'number' },
        { id: 'size', label: t('inputs.size'), type: 'number', optional: true },
        {
          id: 'category',
          label: t('inputs.category'),
          type: 'string',
          optional: true,
        },
      ],
      heatmap: [
        { id: 'x', label: t('inputs.x'), type: 'string' },
        { id: 'y', label: t('inputs.y'), type: 'datetime' },
        { id: 'value', label: t('inputs.value'), type: 'number' },
      ],
      histogram: [{ id: 'value', label: t('inputs.value'), type: 'number' }],
      timeline: [
        { id: 'name', label: t('inputs.name'), type: 'string' },
        { id: 'start', label: t('inputs.start'), type: 'datetime' },
        { id: 'end', label: t('inputs.end'), type: 'datetime' },
        {
          id: 'category',
          label: t('inputs.category'),
          type: 'string',
          optional: true,
        },
      ],
    }),
    [t],
  )

  const visualizations = useMemo<ModuleVisualizationDefinition[]>(
    () => [
      {
        id: 'line',
        label: t('visualizations.line'),
        inputs: visualizationInputs.line,
      },
      {
        id: 'area',
        label: t('visualizations.area'),
        inputs: visualizationInputs.area,
      },
      {
        id: 'bar',
        label: t('visualizations.bar'),
        inputs: visualizationInputs.bar,
      },
      {
        id: 'stackedBar',
        label: t('visualizations.stackedBar'),
        inputs: visualizationInputs.stackedBar,
      },
      {
        id: 'pie',
        label: t('visualizations.pie'),
        inputs: visualizationInputs.pie,
      },
      {
        id: 'donut',
        label: t('visualizations.donut'),
        inputs: visualizationInputs.donut,
      },
      {
        id: 'scatter',
        label: t('visualizations.scatter'),
        inputs: visualizationInputs.scatter,
      },
      {
        id: 'heatmap',
        label: t('visualizations.heatmap'),
        inputs: visualizationInputs.heatmap,
      },
      {
        id: 'histogram',
        label: t('visualizations.histogram'),
        inputs: visualizationInputs.histogram,
      },
      {
        id: 'timeline',
        label: t('visualizations.timeline'),
        inputs: visualizationInputs.timeline,
      },
    ],
    [t, visualizationInputs],
  )

  const currentModuleFromStore = useMemo(() => {
    if (params.moduleId) {
      return modules.find((item) => item.id === params.moduleId) || null
    }
    if (selectedModuleId) {
      return modules.find((item) => item.id === selectedModuleId) || null
    }
    return modules[0] || null
  }, [modules, params.moduleId, selectedModuleId])

  useEffect(() => {
    if (params.moduleId) {
      setSelectedModuleId(params.moduleId)
    }
  }, [params.moduleId, setSelectedModuleId])

  useEffect(() => {
    if (!currentModuleFromStore) return

    setDraftModule(cloneModule(currentModuleFromStore))
    setIsDirty(false)
    setReorderEnabled(false)
  }, [currentModuleFromStore])

  const selectModule = (id: string) => {
    setSelectedModuleId(id)
  }

  const setDirtyModule = (
    updater: (module: ModuleDefinition) => ModuleDefinition,
  ) => {
    setDraftModule((current) => {
      if (!current) return current
      const next = updater(current)
      setIsDirty(true)
      return next
    })
  }

  const ensureBindings = (component: ModuleComponent): ModuleComponent => {
    const definition = visualizations.find(
      (item) => item.id === component.visualization,
    )
    const inputs = definition?.inputs ?? []
    return {
      ...component,
      bindings: normalizeBindings(component.bindings, inputs),
    }
  }

  const updateName = (value: string) =>
    setDirtyModule((current) => ({ ...current, name: value }))

  const updateHeroDescription = (value: string) =>
    setDirtyModule((current) => ({ ...current, heroDescription: value }))

  const openCreateComponent = () => {
    const defaultVisualization = visualizations[0]?.id ?? 'line'
    const defaultSchema = moduleSchemas[0]?.id ?? ''

    const draft: ModuleComponent = {
      id: createId('component'),
      kind: 'chart',
      visualization: defaultVisualization,
      schemaId: defaultSchema,
      bindings: normalizeBindings(
        [],
        visualizationInputs[defaultVisualization] ?? [],
      ),
      title: '',
      description: '',
    }

    setEditor({ open: true, mode: 'create', component: draft })
  }

  const openEditComponent = (componentId: string) => {
    if (!draftModule) return
    const component = draftModule.components.find(
      (item) => item.id === componentId,
    )
    if (!component) return

    setEditor({
      open: true,
      mode: 'edit',
      component: ensureBindings(structuredClone(component)),
    })
  }

  const closeEditor = () =>
    setEditor({ open: false, mode: 'create', component: null })

  const submitComponent = (component: ModuleComponent) => {
    setDraftModule((current) => {
      if (!current) return current
      const nextComponent = ensureBindings(component)
      const existingIndex = current.components.findIndex(
        (item) => item.id === nextComponent.id,
      )
      const components = [...current.components]

      if (existingIndex >= 0) {
        components[existingIndex] = nextComponent
      } else {
        components.push(nextComponent)
      }

      return { ...current, components }
    })
    setIsDirty(true)
    closeEditor()
  }

  const reorderComponent = (fromId: string, toId: string) => {
    setDirtyModule((current) => {
      const items = [...current.components]
      const fromIndex = items.findIndex((item) => item.id === fromId)
      const toIndex = items.findIndex((item) => item.id === toId)

      if (fromIndex === -1 || toIndex === -1) return current

      const [removed] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, removed)

      return { ...current, components: items }
    })
  }

  const deleteComponent = (componentId: string) => {
    setDirtyModule((current) => ({
      ...current,
      components: current.components.filter((item) => item.id !== componentId),
    }))
  }

  const saveModule = () => {
    if (!draftModule) return
    updateModule(draftModule)
    setIsDirty(false)
    setReorderEnabled(false)
    setEditingField(null)
  }

  const cancelChanges = () => {
    if (currentModuleFromStore) {
      setDraftModule(cloneModule(currentModuleFromStore))
    }
    setIsDirty(false)
    setReorderEnabled(false)
    setEditingField(null)
  }

  return {
    t,
    module: draftModule,
    schemas: moduleSchemas,
    visualizations,
    isDirty,
    reorderEnabled,
    editor,
    editingField,
    setEditingField,
    setReorderEnabled,
    openCreateComponent,
    openEditComponent,
    closeEditor,
    submitComponent,
    reorderComponent,
    updateName,
    updateHeroDescription,
    saveModule,
    cancelChanges,
    selectModule,
    deleteComponent,
  }
}

export default useModulesService
