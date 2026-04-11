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

export interface IEventFieldFilter {
  schema_id?: string
  field_key: string
  value: string
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
