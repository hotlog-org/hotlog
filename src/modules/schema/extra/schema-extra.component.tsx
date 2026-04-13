'use client'

import { Plus as LucidePlus } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { ExpandableSearch } from '@/shared/ui/expandable-search'
import { TFunction } from '../schema.service'

export interface SchemaExtraComponentProps {
  t: TFunction
  search: string
  canCreate: boolean
  onSearchChange: (value: string) => void
  onAddSchema: () => void
}

export function SchemaExtraComponent(props: SchemaExtraComponentProps) {
  return (
    <div className='flex items-center gap-2'>
      {props.canCreate && (
        <Button
          onClick={props.onAddSchema}
          className='gap-2 whitespace-nowrap h-9'
          variant='outline'
        >
          <LucidePlus className='size-4' />
          <span className='hidden sm:inline'>
            {props.t('actions.addSchema')}
          </span>
        </Button>
      )}

      <ExpandableSearch
        value={props.search}
        onChange={props.onSearchChange}
        placeholder={props.t('search.placeholder')}
      />
    </div>
  )
}
