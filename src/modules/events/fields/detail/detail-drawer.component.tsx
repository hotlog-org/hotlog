'use client'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Separator } from '@/shared/ui/separator'
import { Info } from 'lucide-react'

import type {
  EventRecord,
  EventSchema,
  SchemaField,
} from '@/lib/events/events.contract'
import type { TFunction } from '../../events.service'
import { useDetailDrawerService, renderers } from './detail-drawer.service'

export interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  event: EventRecord | null
  schema: EventSchema | null
  t: TFunction
}

const FieldRow = ({
  field,
  value,
  t,
}: {
  field: SchemaField
  value: unknown
  t: DetailDrawerProps['t']
}) => {
  const Renderer = renderers[field.type]
  return (
    <div className='flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/20 px-4 py-3'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-medium text-foreground'>{field.label}</p>
          {field.description ? (
            <p className='text-xs text-muted-foreground'>{field.description}</p>
          ) : null}
        </div>
        <Badge variant='outline' className='text-[11px] capitalize'>
          {field.type}
        </Badge>
      </div>
      <div className='text-right md:text-left'>
        {Renderer ? Renderer(value, t) : null}
      </div>
    </div>
  )
}

export function DetailDrawer(props: DetailDrawerProps) {
  const service = useDetailDrawerService(props)

  if (!service.event || !service.schema) return null

  return (
    <Drawer
      open={service.open}
      onOpenChange={(isOpen) => !isOpen && service.onClose()}
      direction='right'
    >
      <DrawerContent className='sm:max-w-xl lg:max-w-3xl'>
        <DrawerHeader className='px-6 pb-2'>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <DrawerTitle className='text-xl'>
                {service.event.title}
              </DrawerTitle>
              <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
                <span>{service.schema.name}</span>
                <span className='text-border'>•</span>
                <span>{service.createdLabel}</span>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <Separator className='border-border/80' />

        <ScrollArea className='max-h-[70vh] px-6 py-4'>
          <div className='w-full inline-flex justify-between items-center mb-4 gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 '>
            <div className='flex gap-4 text-sm col-span-2'>
              <div>
                <p className='text-muted-foreground text-xs uppercase tracking-wide'>
                  {service.t('detail.eventId')}
                </p>
                <p className='font-medium'>{service.event.id}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs uppercase tracking-wide'>
                  {service.t('detail.schema')}
                </p>
                <p className='font-medium'>{service.schema.name}</p>
              </div>
            </div>
            <Info className='text-muted-foreground hidden h-5 w-5 sm:block' />
          </div>

          <div className='space-y-3'>
            {service.fieldRows.map((row) => (
              <FieldRow
                key={row.field.key}
                field={row.field}
                value={row.value}
                t={service.t}
              />
            ))}
          </div>
        </ScrollArea>

        <DrawerFooter className='border-t border-border/70 bg-muted/30'>
          <div className='flex items-center justify-end gap-3'>
            <DrawerClose asChild>
              <Button variant='ghost' onClick={service.onClose}>
                {service.t('detail.close')}
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
