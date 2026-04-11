import type { ProjectFieldType } from './schema.interface'

export enum EEventApi {
  EVENTS_API = 'project/events',
  EVENT_STATS_API = 'project/events/stats',
}

export enum EEventKey {
  EVENTS_QUERY = 'events_query',
  EVENT_STATS_QUERY = 'event_stats_query',
}

export interface IEventDto {
  id: number
  createdAt: string
  schemaId: string
  schemaKey: string
  schemaDisplayName: string
  value: Record<string, unknown>
}

export interface IEventListResponse {
  data: IEventDto[]
  nextCursor: string | null
}

// Operator vocabulary. The simple five symbols cover ordering for
// number / datetime / etc. The three "fuzzy" ones (`contains`,
// `starts_with`, `ends_with`) are surfaced in the parser as the
// keywords `?=`, `start`, `end` respectively. Array and json
// fields layer extra semantics on top via `quantifier` and `key_path`.
export type EventFilterOperator =
  | 'eq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'starts_with'
  | 'ends_with'

// Optional quantifier for array fields. Modifies how `operator` is
// applied to the array's elements:
//   - 'has': the operator is `eq` and the value must appear in the
//     array (jsonb element containment).
//   - 'any': at least one element satisfies `operator value`.
//   - 'all': every element satisfies `operator value`.
export type EventFilterQuantifier = 'has' | 'any' | 'all'

export interface IEventFieldFilter {
  schema_id?: string
  field_key: string
  field_type: ProjectFieldType
  operator: EventFilterOperator
  // For json fields: dot-separated path into the nested object,
  // e.g. `address.city`. The operator is applied to the extracted
  // value at that path. Empty/undefined for non-json fields.
  key_path?: string
  // For array fields: see EventFilterQuantifier above. Empty/undefined
  // for non-array fields.
  quantifier?: EventFilterQuantifier
  // Single value used by all operators. (We dropped multi-value
  // operators in the simplification.)
  values: string[]
}

export interface IEventListParams {
  projectId: string
  limit?: number
  cursor?: string | null
  schemas?: string[]
  search?: string
  fieldFilters?: IEventFieldFilter[]
}

export interface IEventDailyCountDto {
  day: string
  count: number
}

export interface IEventStatsResponse {
  data: IEventDailyCountDto[]
}

export interface IDeleteEventsPayload {
  projectId: string
  ids: number[]
}

export interface IDeleteEventsResponse {
  data: { deleted: number }
}
