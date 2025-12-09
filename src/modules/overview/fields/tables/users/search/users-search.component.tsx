'use client'

import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Input } from '@/shared/ui/input'

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
    <div className='relative'>
      <Input
        value={service.search}
        onChange={(event) => service.handleChange(event.target.value)}
        placeholder={props.t('users.searchPlaceholder')}
        className='pl-9'
      />
      <HugeiconsIcon
        icon={Search01Icon}
        className='text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2'
      />
    </div>
  )
}
