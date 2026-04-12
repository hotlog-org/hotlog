export type ModuleFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'
  | 'array'
  | 'json'

export type ModuleVisualizationType =
  | 'area'
  | 'bar'
  | 'donut'
  | 'heatmap'
  | 'histogram'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'stackedBar'
  | 'timeline'

export interface ModuleVisualizationInput {
  id: string
  label: string
  type: ModuleFieldType | 'datetime'
  optional?: boolean
}

export interface ModuleVisualizationDefinition {
  id: ModuleVisualizationType
  label: string
  inputs: ModuleVisualizationInput[]
}

export interface ModuleSchemaField {
  key: string
  label: string
  type: ModuleFieldType
}

export interface ModuleSchemaDefinition {
  id: string
  name: string
  fields: ModuleSchemaField[]
}

export interface ModuleBinding {
  inputId: string
  fieldKey: string | null | undefined
}

export type ModuleComponentSpan = 'full' | 'half'

export interface ModuleComponent {
  id: string
  kind: 'chart'
  visualization: ModuleVisualizationType
  schemaId: string
  bindings: ModuleBinding[]
  title?: string
  description?: string
  order?: number
  span: ModuleComponentSpan
}

export interface ModuleDefinition {
  id: string
  name: string
  description?: string
  color: string
  heroTitle?: string
  heroDescription?: string
  components: ModuleComponent[]
}

export interface ModuleCreationPayload {
  name: string
  color: string
}

export interface ModuleEditorPayload {
  component: ModuleComponent
  mode: 'create' | 'edit'
}

export type TFunction = ReturnType<
  typeof useTranslations<'modules.dashboard.modules'>
>
import type { useTranslations } from 'next-intl'
