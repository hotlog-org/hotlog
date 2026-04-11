'use client'

import { useRef } from 'react'
import { X as LucideX } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02FreeIcons } from '@hugeicons/core-free-icons'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Skeleton } from '@/shared/ui/skeleton'
import { useInfiniteScroll } from '@/shared/hooks'

import useEventsService from './events.service'
import { EventsTable } from './fields/table/events-table.component'
import { DetailDrawer } from './fields/detail/detail-drawer.component'

function EventsTableSkeleton() {
  return (
    <div className='space-y-2'>
      <Skeleton className='h-10 w-full' />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className='flex items-center gap-4 rounded-md p-3'>
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-48' />
            <Skeleton className='h-3 w-24' />
          </div>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-4 w-12' />
        </div>
      ))}
    </div>
  )
}

export function EventsComponent() {
  const service = useEventsService()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const { lastElementRef } = useInfiniteScroll({
    hasNextPage: service.hasNextPage,
    isFetching: service.isFetchingNextPage,
    isFetchingNextPage: service.isFetchingNextPage,
    fetchNextPage: service.loadMore,
    rootRef: scrollRef,
  })

  const pendingDeleteCount = service.pendingDeleteIds?.length ?? 0

  return (
    <div className='flex flex-1 flex-col space-y-4'>
      <div className='flex flex-1 flex-col space-y-2'>
        <h1 className='text-2xl'>{service.t('title')}</h1>

        {(service.selectedSchemas.length > 0 ||
          service.appliedFilters.length > 0) && (
          <div className='flex flex-wrap items-center gap-2'>
            {service.selectedSchemas.map((schemaId) => {
              const schema = service.schemas.find((s) => s.id === schemaId)
              return (
                <span
                  key={`schema-${schemaId}`}
                  className='border-border text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs'
                >
                  <span className='font-medium text-foreground'>
                    {schema?.name ?? schemaId}
                  </span>
                  <button
                    type='button'
                    onClick={() => service.removeSchema(schemaId)}
                    className='hover:text-foreground'
                  >
                    <LucideX className='size-3.5' />
                  </button>
                </span>
              )
            })}

            {service.appliedFilters.map((filter) => {
              const schema = service.schemas.find(
                (s) => s.id === filter.schemaId,
              )
              return (
                <span
                  key={`${filter.schemaId}-${filter.fieldKey}`}
                  className='border-border text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs'
                >
                  <span className='font-medium text-foreground'>
                    {schema?.name ?? filter.schemaId}
                  </span>
                  <span className='text-border'>/</span>
                  <span>{filter.fieldKey}</span>
                  <span className='text-border'>=</span>
                  <span className='text-foreground'>{filter.value}</span>
                  <button
                    type='button'
                    onClick={() =>
                      service.removeFieldFilter(
                        filter.schemaId,
                        filter.fieldKey,
                      )
                    }
                    className='hover:text-foreground'
                  >
                    <LucideX className='size-3.5' />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {service.canDelete && service.selectedCount > 0 && (
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2'>
            <span className='text-sm text-foreground'>
              {service.t('actions.selectedCount', {
                count: service.selectedCount,
              })}
            </span>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={service.clearSelection}
              >
                {service.t('actions.clearSelection')}
              </Button>
              <Button
                variant='destructive'
                size='sm'
                onClick={() =>
                  service.requestDelete(
                    Array.from(service.selectedIds, (id) => Number(id)).filter(
                      (n) => Number.isFinite(n),
                    ),
                  )
                }
              >
                <HugeiconsIcon icon={Delete02FreeIcons} className='size-4' />
                {service.t('actions.deleteSelected', {
                  count: service.selectedCount,
                })}
              </Button>
            </div>
          </div>
        )}

        {service.hasNoProject ? (
          <div className='flex flex-1 items-center justify-center text-muted-foreground'>
            {service.t('emptyState.noProject')}
          </div>
        ) : !service.canRead ? (
          <div className='flex flex-1 items-center justify-center text-muted-foreground'>
            {service.t('emptyState.noPermission')}
          </div>
        ) : service.isLoading && service.rows.length === 0 ? (
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <EventsTableSkeleton />
          </div>
        ) : (
          <div
            ref={scrollRef}
            className='flex min-h-0 flex-1 flex-col overflow-y-auto'
          >
            <EventsTable
              rows={service.rows}
              onOpen={service.openEvent}
              onDelete={(id) => service.requestDelete([id])}
              canDelete={service.canDelete}
              t={service.t}
              paginated={false}
              selectable={service.canDelete}
              selectedIds={service.selectedIds}
              onToggleRow={service.toggleRowSelection}
              onToggleAllVisible={service.toggleManySelection}
              footer={
                <div
                  ref={lastElementRef}
                  className='flex h-12 items-center justify-center text-xs text-muted-foreground'
                >
                  {service.isFetchingNextPage
                    ? service.t('actions.loading')
                    : service.hasNextPage
                      ? null
                      : service.rows.length > 0
                        ? service.t('actions.endOfList')
                        : null}
                </div>
              }
            />
          </div>
        )}
      </div>

      <DetailDrawer
        open={service.drawerOpen}
        onClose={service.closeDrawer}
        event={service.selectedEvent}
        schema={service.selectedSchema}
        t={service.t}
      />

      <Dialog
        open={service.pendingDeleteIds !== null}
        onOpenChange={(open) => {
          if (!open) service.cancelDelete()
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {service.t('confirmDelete.title', { count: pendingDeleteCount })}
            </DialogTitle>
            <DialogDescription>
              {service.t('confirmDelete.description', {
                count: pendingDeleteCount,
              })}
            </DialogDescription>
          </DialogHeader>
          {service.deleteError ? (
            <p className='text-sm text-red-500'>{service.deleteError}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={service.cancelDelete}
              disabled={service.isDeleting}
            >
              {service.t('confirmDelete.cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={service.confirmDelete}
              disabled={service.isDeleting}
            >
              {service.isDeleting
                ? service.t('confirmDelete.deleting')
                : service.t('confirmDelete.confirm', {
                    count: pendingDeleteCount,
                  })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
