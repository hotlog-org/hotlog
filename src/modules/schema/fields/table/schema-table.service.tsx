import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Heading01Icon,
  TextNumberSignIcon,
  PulseFreeIcons,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Badge } from '@/shared/ui/badge'

import type { SchemaRow } from '../../schema.interface'
import type { SchemaTableProps } from './schema-table.component'

export const useSchemaTableService = ({ onOpen, t }: SchemaTableProps) => {
  const columns: ColumnDef<SchemaRow>[] = useMemo(
    () => [
      {
        accessorKey: 'displayName',
        header: () => (
          <div className='flex items-center gap-2'>
            <HugeiconsIcon icon={Heading01Icon} className='size-4' />
            <span>{t('table.schema')}</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <span className='font-medium text-foreground'>
              {row.original.displayName}
            </span>
            <Badge
              variant='outline'
              className='font-mono text-[10px] mt-1 w-fit'
            >
              {row.original.key}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: 'fieldsCount',
        header: () => (
          <div className='flex items-center gap-2'>
            <HugeiconsIcon icon={TextNumberSignIcon} className='size-4' />
            <span>{t('table.fields')}</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className='font-medium text-foreground'>
            {row.original.fieldsCount}
          </span>
        ),
      },
      {
        accessorKey: 'eventsCount',
        header: () => (
          <div className='flex items-center gap-2'>
            <HugeiconsIcon icon={PulseFreeIcons} className='size-4' />
            <span>{t('table.events')}</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className='font-medium text-foreground'>
            {row.original.eventsCount}
          </span>
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <button
            type='button'
            aria-label={t('table.open')}
            className='inline-flex items-center justify-center gap-1 text-sm underline opacity-60'
            onClick={(e) => {
              e.stopPropagation()
              onOpen(row.original.id)
            }}
          >
            {t('table.open')}
          </button>
        ),
      },
    ],
    [onOpen, t],
  )

  return { columns }
}
