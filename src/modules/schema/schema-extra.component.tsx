'use client'

import { Search as LucideSearch, Plus as LucidePlus } from 'lucide-react'

import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import type { TFunction } from './schema.service'

export interface SchemaExtraComponentProps {
  t: TFunction
  search: string
  onSearchChange: (value: string) => void
  onAddSchema: () => void
}

export function SchemaExtraComponent(props: SchemaExtraComponentProps) {
  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap items-end gap-3'>
        <Button
          onClick={props.onAddSchema}
          className='gap-2 whitespace-nowrap h-9'
          variant={'outline'}
        >
          <LucidePlus className='size-4' />
          {props.t('actions.addSchema')}
        </Button>

        <div className='relative w-64 min-w-[240px]'>
          <LucideSearch className='text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2' />
          <Input
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder={props.t('search.placeholder')}
            className='h-9 pl-8 pr-2'
          />
        </div>
      </div>
    </div>
  )
}
