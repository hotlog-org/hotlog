'use client'

import { Search, X } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'

import type { EventsSearchBarProps } from './search-bar.interface'
import { useSearchBarService } from './search-bar.service'

export function EventsSearchBar(props: EventsSearchBarProps) {
  const service = useSearchBarService(props)

  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Badge variant='secondary'>{service.filteredCount}</Badge>
        <span>
          {service.t('search.showing', {
            filtered: service.filteredCount,
            total: service.totalCount,
          })}
        </span>
      </div>

      <div className='flex w-full items-center gap-2 md:w-auto'>
        <div className='relative w-full md:min-w-[320px]'>
          <Search className='text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2' />
          <Input
            value={service.query}
            onChange={(event) => service.onQueryChange(event.target.value)}
            placeholder={service.t('search.placeholder')}
            className='pl-10 pr-10'
          />
          {service.hasQuery ? (
            <Button
              variant='ghost'
              size='icon'
              className='absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2'
              onClick={service.clear}
            >
              <X className='size-4' />
              <span className='sr-only'>{service.t('search.clear')}</span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
