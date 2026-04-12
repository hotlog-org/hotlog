export enum ELayoutApi {
  LAYOUTS_API = 'project/layouts',
  LAYOUTS_COMPONENTS_API = 'project/layouts/components',
}

export enum ELayoutKey {
  LAYOUTS_QUERY = 'layouts_query',
}

export interface ILayoutComponentDto {
  id: string
  visualization: string
  schemaId: string | null
  bindings: Array<{ inputId: string; fieldKey: string | null }>
  title: string
  description: string
  index: number
  span: string
}

export interface ILayoutDto {
  id: number
  name: string
  description: string
  color: string
  components: ILayoutComponentDto[]
  createdAt: string
}

export interface ILayoutListResponse {
  data: ILayoutDto[]
}

export interface ILayoutResponse {
  data: ILayoutDto
}

export interface ICreateLayoutPayload {
  project_id: string
  name: string
  color: string
  description?: string
}

export interface IUpdateLayoutPayload {
  id: number
  name?: string
  color?: string
  description?: string
}

export interface IBatchComponentCreate {
  visualization: string
  schema_id: string | null
  bindings: Array<{ inputId: string; fieldKey: string | null }>
  title: string
  description: string
  index: number
  span: string
}

export interface IBatchComponentUpdate {
  id: string
  visualization?: string
  schema_id?: string | null
  bindings?: Array<{ inputId: string; fieldKey: string | null }>
  title?: string
  description?: string
  index?: number
  span?: string
}

export interface IBatchComponentsPayload {
  layout_id: number
  creates: IBatchComponentCreate[]
  updates: IBatchComponentUpdate[]
  deletes: string[]
}

export interface IBatchComponentsResponse {
  data: ILayoutComponentDto[]
}
