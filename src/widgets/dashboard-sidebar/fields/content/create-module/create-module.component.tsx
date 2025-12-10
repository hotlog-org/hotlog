'use client'

import { AddCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar'
import { cn } from '@/shared/utils/shadcn.utils'
import { useDashboardSidebarCreateModuleService } from './create-module.service'

export interface DashboardSidebarCreateModuleProps {
  sidebarState: string
}

export const DashboardSidebarCreateModuleComponent = (
  props: DashboardSidebarCreateModuleProps,
) => {
  const service = useDashboardSidebarCreateModuleService(props)

  return (
    <SidebarMenuItem>
      <Dialog open={service.open} onOpenChange={service.setOpen}>
        <DialogTrigger asChild>
          <SidebarMenuButton
            className={cn(
              'text-muted-foreground',
              props.sidebarState == 'collapsed' && 'flex items-center justify-center',
            )}
            tooltip={service.buttonLabel}
          >
            {props.sidebarState === 'collapsed' ? (
              <HugeiconsIcon icon={AddCircleIcon} size={16} />
            ) : (
              <>
                <HugeiconsIcon icon={AddCircleIcon} size={16} />
                <span>{service.buttonLabel}</span>
              </>
            )}
          </SidebarMenuButton>
        </DialogTrigger>

        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{service.t('create.title')}</DialogTitle>
            <DialogDescription>{service.t('create.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <Field>
              <FieldLabel>{service.t('create.name')}</FieldLabel>
              <FieldControl>
                <Input
                  value={service.name}
                  onChange={(event) => service.setName(event.target.value)}
                  placeholder={service.t('create.namePlaceholder')}
                />
              </FieldControl>
            </Field>

            <Field>
              <FieldLabel>{service.t('create.color')}</FieldLabel>
              <FieldControl>
                <div className='flex items-center gap-3'>
                  <Input
                    type='color'
                    value={service.color}
                    onChange={(event) => service.setColor(event.target.value)}
                    className='h-10 w-20 cursor-pointer p-1'
                  />
                  <Input
                    value={service.color}
                    onChange={(event) => service.setColor(event.target.value)}
                  />
                </div>
              </FieldControl>
            </Field>
          </div>

          <DialogFooter className='flex items-center justify-end gap-2'>
            <Button variant='ghost' onClick={() => service.setOpen(false)}>
              {service.t('create.cancel')}
            </Button>
            <Button onClick={service.handleSubmit} disabled={!service.name.trim()}>
              {service.t('create.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  )
}

