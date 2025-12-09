'use client'

import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Input } from '@/shared/ui/input'

import type { TFunction } from '../../../../overview.service'
import { useRolesSearchService } from './roles-search.service'

export interface RolesSearchProps {
  value: string
  onChange: (value: string) => void
  t: TFunction
}

export function RolesSearch(props: RolesSearchProps) {
  const service = useRolesSearchService(props)

  return (
    <div className='relative'>
      <Input
        value={service.search}
        onChange={(event) => service.handleChange(event.target.value)}
        placeholder={props.t('roles.searchPlaceholder')}
        className='pl-9'
      />
      <HugeiconsIcon
        icon={Search01Icon}
        className='text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2'
      />
    </div>
  )
}
