'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  useBatchComponentsMutation,
  useLayoutsQuery,
  useUpdateLayoutMutation,
} from '@/shared/api/layout'
import { useSchemasQuery } from '@/shared/api/schema'
import type {
  IBatchComponentCreate,
  IBatchComponentUpdate,
  ILayoutDto,
} from '@/shared/api/interface'
import { useUserPermissions } from '@/shared/api/user-permission/user-permission.hook'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'

import type {
  ModuleBinding,
  ModuleComponent,
  ModuleComponentSpan,
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

function layoutDtoToModule(dto: ILayoutDto): ModuleDefinition {
  return {
    id: String(dto.id),
    name: dto.name,
    description: dto.description,
    color: dto.color,
    heroTitle: dto.name,
    heroDescription: dto.description,
    components: dto.components.map((c) => ({
      id: c.id,
      kind: 'chart' as const,
      visualization: c.visualization as ModuleVisualizationType,
      schemaId: c.schemaId ?? '',
      bindings: c.bindings,
      title: c.title,
      description: c.description,
      order: c.index,
      span: (c.span === 'half' ? 'half' : 'full') as ModuleComponentSpan,
    })),
  }
}

interface ModulesServiceParams {
  moduleId?: string
}

export interface ModulesService {
  t: TFunction
  module: ModuleDefinition | null
  modules: ModuleDefinition[]
  schemas: ModuleSchemaDefinition[]
  visualizations: ModuleVisualizationDefinition[]
  isDirty: boolean
  isSaving: boolean
  isLoading: boolean
  reorderEnabled: boolean
  editor: {
    open: boolean
    mode: 'create' | 'edit'
    component: ModuleComponent | null
  }
  editingField: 'name' | 'heroDescription' | null
  canCreateLayouts: boolean
  canUpdateLayouts: boolean
  canDeleteLayouts: boolean
  canCreateComponents: boolean
  canUpdateComponents: boolean
  canDeleteComponents: boolean
  setEditingField: (field: 'name' | 'heroDescription' | null) => void
  setReorderEnabled: (value: boolean) => void
  openCreateComponent: () => void
  openEditComponent: (componentId: string) => void
  closeEditor: () => void
  submitComponent: (component: ModuleComponent) => void
  reorderComponent: (fromId: string, toId: string) => void
  updateName: (value: string) => void
  updateColor: (value: string) => void
  updateHeroDescription: (value: string) => void
  saveModule: () => void
  cancelChanges: () => void
  selectModule: (id: string) => void
  toggleComponentSpan: (componentId: string) => void
  deleteComponent: (componentId: string) => void
}

export const useModulesService = (
  params: ModulesServiceParams = {},
): ModulesService => {
  const t = useTranslations('modules.dashboard.modules')
  const selectedProjectId = useDashboardProject(
    (state) => state.selectedProjectId,
  )

  const layoutsQuery = useLayoutsQuery(selectedProjectId)
  const schemasQuery = useSchemasQuery(selectedProjectId)
  const updateLayoutMutation = useUpdateLayoutMutation(selectedProjectId)
  const batchComponentsMutation = useBatchComponentsMutation(selectedProjectId)
  const { can } = useUserPermissions(selectedProjectId)

  const [draftModule, setDraftModule] = useState<ModuleDefinition | null>(null)
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

  const { selectedModuleId, setSelectedModuleId } = useModulesStore()

  const modules = useMemo<ModuleDefinition[]>(
    () => (layoutsQuery.data?.data ?? []).map(layoutDtoToModule),
    [layoutsQuery.data],
  )

  const schemas = useMemo<ModuleSchemaDefinition[]>(
    () =>
      (schemasQuery.data?.data ?? []).map((s) => ({
        id: s.id,
        name: s.displayName || s.key,
        fields: [],
      })),
    [schemasQuery.data],
  )

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
    if (!selectedModuleId && !params.moduleId && modules.length > 0) {
      setSelectedModuleId(modules[0].id)
    }
  }, [modules, selectedModuleId, params.moduleId, setSelectedModuleId])

  useEffect(() => {
    if (!currentModuleFromStore) {
      setDraftModule(null)
      return
    }

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

  const updateColor = (value: string) =>
    setDirtyModule((current) => ({ ...current, color: value }))

  const updateHeroDescription = (value: string) =>
    setDirtyModule((current) => ({ ...current, heroDescription: value }))

  const openCreateComponent = () => {
    const defaultVisualization = visualizations[0]?.id ?? 'line'
    const defaultSchema = schemas[0]?.id ?? ''

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
      span: 'full',
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

  const toggleComponentSpan = (componentId: string) => {
    setDirtyModule((current) => ({
      ...current,
      components: current.components.map((item) =>
        item.id === componentId
          ? { ...item, span: item.span === 'half' ? 'full' : 'half' }
          : item,
      ),
    }))
  }

  const deleteComponent = (componentId: string) => {
    setDirtyModule((current) => ({
      ...current,
      components: current.components.filter((item) => item.id !== componentId),
    }))
  }

  const saveModule = async () => {
    if (!draftModule || !currentModuleFromStore) return

    const layoutId = Number(draftModule.id)

    const metadataChanged =
      draftModule.name !== currentModuleFromStore.name ||
      draftModule.color !== currentModuleFromStore.color ||
      (draftModule.heroDescription ?? '') !==
        (currentModuleFromStore.heroDescription ?? '')

    if (metadataChanged) {
      await updateLayoutMutation.mutateAsync({
        id: layoutId,
        name: draftModule.name,
        color: draftModule.color,
        description: draftModule.heroDescription ?? draftModule.description ?? '',
      })
    }

    const originalIds = new Set(
      currentModuleFromStore.components.map((c) => c.id),
    )
    const draftIds = new Set(draftModule.components.map((c) => c.id))

    const normalizeBindingsForApi = (bindings: ModuleBinding[]) =>
      bindings.map((b) => ({ inputId: b.inputId, fieldKey: b.fieldKey ?? null }))

    const creates: IBatchComponentCreate[] = draftModule.components
      .filter((c) => !originalIds.has(c.id))
      .map((c) => ({
        visualization: c.visualization,
        schema_id: c.schemaId || null,
        bindings: normalizeBindingsForApi(c.bindings),
        title: c.title ?? '',
        description: c.description ?? '',
        index: draftModule.components.indexOf(c),
        span: c.span ?? 'full',
      }))

    const updates: IBatchComponentUpdate[] = draftModule.components
      .filter((c) => originalIds.has(c.id))
      .map((c) => ({
        id: c.id,
        visualization: c.visualization,
        schema_id: c.schemaId || null,
        bindings: normalizeBindingsForApi(c.bindings),
        title: c.title ?? '',
        description: c.description ?? '',
        index: draftModule.components.indexOf(c),
        span: c.span ?? 'full',
      }))

    const deletes = currentModuleFromStore.components
      .filter((c) => !draftIds.has(c.id))
      .map((c) => c.id)

    const hasComponentChanges =
      creates.length > 0 || updates.length > 0 || deletes.length > 0

    if (hasComponentChanges) {
      await batchComponentsMutation.mutateAsync({
        layout_id: layoutId,
        creates,
        updates,
        deletes,
      })
    }

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
    modules,
    schemas,
    visualizations,
    isDirty,
    isSaving:
      updateLayoutMutation.isPending || batchComponentsMutation.isPending,
    isLoading: layoutsQuery.isLoading,
    reorderEnabled,
    editor,
    editingField,
    canCreateLayouts: can('create:layouts'),
    canUpdateLayouts: can('update:layouts'),
    canDeleteLayouts: can('delete:layouts'),
    canCreateComponents: can('create:components'),
    canUpdateComponents: can('update:components'),
    canDeleteComponents: can('delete:components'),
    setEditingField,
    setReorderEnabled,
    openCreateComponent,
    openEditComponent,
    closeEditor,
    submitComponent,
    reorderComponent,
    updateName,
    updateColor,
    updateHeroDescription,
    saveModule,
    cancelChanges,
    selectModule,
    toggleComponentSpan,
    deleteComponent,
  }
}

export default useModulesService
