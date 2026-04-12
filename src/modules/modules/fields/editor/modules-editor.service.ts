import { useEffect, useMemo, useState } from 'react'

import { useSchemaFieldsQuery } from '@/shared/api/schema'

import type {
  ModuleComponent,
  ModuleSchemaDefinition,
  ModuleSchemaField,
  ModuleVisualizationInput,
  ModuleVisualizationType,
} from '../../modules.interface'
import type { ModulesEditorProps } from './modules-editor.component'

const matchesType = (
  inputType: ModuleVisualizationInput['type'],
  fieldType: string,
) => {
  if (inputType === 'string')
    return fieldType === 'string' || fieldType === 'enum'
  if (inputType === 'number')
    return fieldType === 'number' || fieldType === 'boolean'
  if (inputType === 'datetime') return fieldType === 'datetime'
  return inputType === fieldType
}

const normalizeBindings = (
  component: ModuleComponent,
  inputs: ModuleVisualizationInput[],
): ModuleComponent => {
  const bindings = inputs.map((input) => {
    const existing = component.bindings.find(
      (binding) => binding.inputId === input.id,
    )
    return { inputId: input.id, fieldKey: existing?.fieldKey ?? null }
  })

  return { ...component, bindings }
}

const mapFieldType = (type: string): ModuleSchemaField['type'] => {
  switch (type.toLowerCase()) {
    case 'number':
    case 'boolean':
    case 'datetime':
    case 'enum':
    case 'array':
    case 'json':
      return type.toLowerCase() as ModuleSchemaField['type']
    default:
      return 'string'
  }
}

export const useModulesEditorService = (props: ModulesEditorProps) => {
  const [draft, setDraft] = useState<ModuleComponent | null>(null)

  useEffect(() => {
    if (props.component) {
      setDraft(structuredClone(props.component))
    } else {
      setDraft(null)
    }
  }, [props.component])

  const fieldsQuery = useSchemaFieldsQuery(draft?.schemaId || undefined)

  const schemaFields = useMemo<ModuleSchemaField[]>(() => {
    if (!fieldsQuery.data?.data) return []
    return fieldsQuery.data.data.map((f) => ({
      key: f.key,
      label: f.displayName || f.key,
      type: mapFieldType(f.type),
    }))
  }, [fieldsQuery.data])

  const visualizationInputs = useMemo(() => {
    if (!draft) return []
    return (
      props.visualizations.find((item) => item.id === draft.visualization)
        ?.inputs ?? []
    )
  }, [draft?.visualization, props.visualizations])

  useEffect(() => {
    if (!draft) return
    setDraft((current) =>
      current ? normalizeBindings(current, visualizationInputs) : current,
    )
  }, [visualizationInputs])

  const selectedSchema: ModuleSchemaDefinition | undefined = useMemo(() => {
    if (!draft) return props.schemas[0]
    return (
      props.schemas.find((schema) => schema.id === draft.schemaId) ||
      props.schemas[0]
    )
  }, [draft, props.schemas])

  const setDraftValue = (next: ModuleComponent | null) => {
    setDraft(next)
  }

  const handleVisualizationChange = (
    visualization: ModuleVisualizationType,
  ) => {
    if (!draft) return
    const nextInputs =
      props.visualizations.find((item) => item.id === visualization)?.inputs ??
      []
    const next: ModuleComponent = {
      ...draft,
      visualization,
      bindings: [],
    }
    setDraftValue(normalizeBindings(next, nextInputs))
  }

  const handleSchemaChange = (schemaId: string) => {
    if (!draft) return
    setDraftValue({
      ...draft,
      schemaId,
      bindings: draft.bindings.map((binding) => ({
        ...binding,
        fieldKey: null,
      })),
    })
  }

  const handleBindingChange = (inputId: string, fieldKey: string | null) => {
    if (!draft) return
    setDraftValue({
      ...draft,
      bindings: draft.bindings.map((binding) =>
        binding.inputId === inputId ? { ...binding, fieldKey } : binding,
      ),
    })
  }

  const handleTitleChange = (title: string) => {
    if (!draft) return
    setDraftValue({ ...draft, title })
  }

  const handleDescriptionChange = (description: string) => {
    if (!draft) return
    setDraftValue({ ...draft, description })
  }

  const handleSubmit = () => {
    if (!draft) return
    props.onSubmit(draft)
  }

  const availableFieldsForInput = (input: ModuleVisualizationInput) => {
    return schemaFields.filter((field) => matchesType(input.type, field.type))
  }

  return {
    draft,
    inputs: visualizationInputs,
    selectedSchema,
    fieldsLoading: fieldsQuery.isLoading,
    setDraftValue,
    handleVisualizationChange,
    handleSchemaChange,
    handleBindingChange,
    handleTitleChange,
    handleDescriptionChange,
    handleSubmit,
    availableFieldsForInput,
  }
}
