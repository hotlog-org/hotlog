import { useMemo } from 'react'

import type { FilterBarProps } from './filter-bar.component'

export const useFilterBarService = (props: FilterBarProps) => {
  const activeSchemaLabel = useMemo(() => {
    if (props.activeSchemaId === 'all') return props.t('filter.allSchemas')
    return (
      props.schemas.find((schema) => schema.id === props.activeSchemaId)
        ?.name ?? props.t('filter.schema')
    )
  }, [props])

  return {
    ...props,
    activeSchemaLabel,
  }
}
