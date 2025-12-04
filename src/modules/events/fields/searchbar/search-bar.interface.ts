export interface EventsSearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  filteredCount: number
  totalCount: number
  t: (key: string, params?: Record<string, unknown>) => string
}
