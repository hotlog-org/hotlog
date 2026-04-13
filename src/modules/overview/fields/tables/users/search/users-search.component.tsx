'use client'

import { ExpandableSearch } from '@/shared/ui/expandable-search'

import type { TFunction } from '../../../../overview.service'
import { useUsersSearchService } from './users-search.service'

export interface UsersSearchProps {
  value: string
  onChange: (value: string) => void
  t: TFunction
}

export function UsersSearch(props: UsersSearchProps) {
  const service = useUsersSearchService(props)

  return (
    <ExpandableSearch
      value={service.search}
      onChange={service.handleChange}
      placeholder={props.t('users.searchPlaceholder')}
    />
  )
}
