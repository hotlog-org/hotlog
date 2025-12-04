'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import {
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { flexRender } from '@tanstack/react-table'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'

import type { DataTableProps } from './data-table.interface'
import { useDataTableService } from './data-table.service'

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const service = useDataTableService(props)

  return (
    <div
      className={cn('flex h-full min-h-0 flex-col space-y-3', props.className)}
    >
      {/*<div className='flex items-center justify-end text-xs text-muted-foreground'>
        {service.rowCountLabel}
      </div>*/}
      <div className='flex-1 min-h-0 overflow-auto rounded-xl border border-border bg-card shadow-sm'>
        <Table>
          <TableHeader>
            {service.table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={
                        header.column.getCanSort()
                          ? 'cursor-pointer select-none'
                          : undefined
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className='flex items-center gap-2'>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        {{ asc: '↑', desc: '↓' }[
                          header.column.getIsSorted() as string
                        ] ?? null}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {service.table.getRowModel().rows?.length ? (
              service.table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={service.onRowClick ? 'cursor-pointer' : undefined}
                  onClick={() => service.onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={service.columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  {service.t('table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
        <div>
          {service.t('table.pagination', {
            page: service.table.getState().pagination.pageIndex + 1,
            pages: service.table.getPageCount() || 1,
          })}
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => service.table.setPageIndex(0)}
            disabled={!service.table.getCanPreviousPage()}
          >
            <HugeiconsIcon icon={ArrowLeftDoubleIcon} className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => service.table.previousPage()}
            disabled={!service.table.getCanPreviousPage()}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => service.table.nextPage()}
            disabled={!service.table.getCanNextPage()}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() =>
              service.table.setPageIndex(service.table.getPageCount() - 1)
            }
            disabled={!service.table.getCanNextPage()}
          >
            <HugeiconsIcon icon={ArrowRightDoubleIcon} className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
