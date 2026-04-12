'use client'

import { ExpandableSearch } from '@/shared/ui/expandable-search'

import type { TFunction } from '../../../../overview.service'

export interface RolesSearchProps {
  value: string
  onChange: (value: string) => void
  t: TFunction
}

export function RolesSearch(props: RolesSearchProps) {
  return (
    <ExpandableSearch
      value={props.value}
      onChange={props.onChange}
      placeholder={props.t('roles.searchPlaceholder')}
    />
  )
}
