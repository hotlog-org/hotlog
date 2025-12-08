import { useMemo } from 'react'

import type { FilterBarProps } from './filter-bar.component'

export const useFilterBarService = (props: FilterBarProps) => {
  const activeSchemaLabel = useMemo(() => {
    if (!props.activeSchemas.length) return props.t('filter.allSchemas')
    if (props.activeSchemas.length === 1) {
      return (
        props.schemas.find((schema) => schema.id === props.activeSchemas[0])
          ?.name ?? props.t('filter.schema')
      )
    }
    return props.t('filter.schema')
  }, [props])

  return {
    ...props,
    activeSchemaLabel,
  }
}
