'use client'

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  t: (key: string, params?: Record<string, string | number | Date>) => string
  paginated?: boolean
  footer?: React.ReactNode
  // Row selection
  selectable?: boolean
  getRowId?: (row: TData) => string
  selectedIds?: Set<string>
  onToggleRow?: (id: string, selected: boolean) => void
  onToggleAllVisible?: (ids: string[], selected: boolean) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  t,
  paginated = true,
  footer,
  selectable = false,
  getRowId,
  selectedIds,
  onToggleRow,
  onToggleAllVisible,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginated
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: {
            pagination: { pageIndex: 0, pageSize: 10 },
          },
        }
      : {}),
  })

  const visibleRows = table.getRowModel().rows
  const visibleIds = useMemo(
    () =>
      selectable && getRowId
        ? visibleRows.map((row) => getRowId(row.original))
        : [],
    [selectable, getRowId, visibleRows],
  )

  const selectedCount = useMemo(
    () =>
      selectable && selectedIds
        ? visibleIds.filter((id) => selectedIds.has(id)).length
        : 0,
    [selectable, selectedIds, visibleIds],
  )

  const allSelected =
    selectable && visibleIds.length > 0 && selectedCount === visibleIds.length
  const someSelected = selectable && selectedCount > 0 && !allSelected

  const headerColSpan = columns.length + (selectable ? 1 : 0)

  return (
    <div className='h-full w-full space-y-3'>
      <div className='h-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm'>
        <Table className='h-full'>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {selectable ? (
                  <TableHead className='w-10'>
                    <Checkbox
                      aria-label='Select all visible rows'
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={(e) => {
                        onToggleAllVisible?.(visibleIds, e.target.checked)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>
                ) : null}
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
                        {flexRender(
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
          <TableBody className='h-full'>
            {visibleRows.length ? (
              visibleRows.map((row) => {
                const id = getRowId ? getRowId(row.original) : row.id
                const isSelected = Boolean(
                  selectable && selectedIds && selectedIds.has(id),
                )
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {selectable ? (
                      <TableCell
                        className='w-10'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          aria-label='Select row'
                          checked={isSelected}
                          onChange={(e) => {
                            onToggleRow?.(id, e.target.checked)
                          }}
                        />
                      </TableCell>
                    ) : null}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={headerColSpan}
                  className='h-24 text-center text-muted-foreground'
                >
                  {t('table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {footer}
      </div>

      {paginated && (
        <div className='pl-4 flex flex-wrap items-start justify-between gap-3 text-sm text-muted-foreground'>
          <div>
            {t('table.pagination', {
              page: table.getState().pagination.pageIndex + 1,
              pages: table.getPageCount() || 1,
            })}
          </div>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className='size-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className='size-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className='size-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className='size-4' />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
