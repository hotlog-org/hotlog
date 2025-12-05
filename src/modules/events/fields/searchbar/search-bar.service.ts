import { useMemo } from 'react'

import type { EventsSearchBarProps } from './search-bar.component'

export const useSearchBarService = (props: EventsSearchBarProps) => {
  const hasQuery = useMemo(() => props.query.trim().length > 0, [props.query])

  const clear = () => props.onQueryChange('')

  return {
    ...props,
    hasQuery,
    clear,
  }
}
