import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Calendar03Icon,
  Delete02FreeIcons,
  Heading01Icon,
  SchemeIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { EventRow } from '../../mock-data'
import type { EventsTableProps } from './events-table.component'

export const useEventsTableService = ({
  rows,
  onOpen,
  onDelete,
  canDelete,
  t,
}: EventsTableProps) => {
  const columns: ColumnDef<EventRow>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: () => (
          <div className='flex items-center gap-2'>
            <HugeiconsIcon icon={Heading01Icon} className='size-4' />
            <span>{t('table.event')}</span>
          </div>
        ),
        cell: ({ row }) => {
          const createdAt = new Date(row.original.createdAt)
          return (
            <div className='h-auto space-y-1'>
              <div className='flex items-center gap-2'>
                <span className='font-medium text-foreground'>
                  {row.original.title}
                </span>
              </div>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <span>{format(createdAt, 'MMM d, yyyy HH:mm')}</span>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'schemaName',
        header: () => (
          <div className='flex items-center gap-2'>
            <HugeiconsIcon icon={SchemeIcon} className='size-4' />
            <span>{t('table.schema')}</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <span className='flex w-fit items-center gap-2 font-medium'>
              {row.original.schemaName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: () => (
          <div className='flex items-center gap-2'>
            <HugeiconsIcon icon={Calendar03Icon} className='size-4' />
            <span>{t('table.date')}</span>
          </div>
        ),
        minSize: 160,
        cell: ({ row }) => {
          const createdAt = new Date(row.original.createdAt)
          return (
            <div className='flex flex-col whitespace-nowrap text-sm text-muted-foreground'>
              <span className='flex items-center gap-2 text-foreground'>
                {format(createdAt, 'MMM d, yyyy HH:mm')}
              </span>
              <span className='text-xs'>
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
            </div>
          )
        },
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-3'>
            <button
              type='button'
              aria-label={t('table.open')}
              className='inline-flex items-center justify-center gap-1 text-sm opacity-60 underline'
              onClick={(e) => {
                e.stopPropagation()
                onOpen(row.original.id)
              }}
            >
              {t('table.open')}
            </button>
            {canDelete && onDelete ? (
              <button
                type='button'
                aria-label={t('actions.delete')}
                title={t('actions.delete')}
                className='inline-flex items-center justify-center text-destructive opacity-60 hover:opacity-100'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(Number(row.original.id))
                }}
              >
                <HugeiconsIcon icon={Delete02FreeIcons} className='size-4' />
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, onDelete, onOpen, t],
  )

  const rowCountLabel = useMemo(
    () => t('table.rowCount', { count: rows.length }),
    [rows.length, t],
  )

  return { columns, rowCountLabel }
}
