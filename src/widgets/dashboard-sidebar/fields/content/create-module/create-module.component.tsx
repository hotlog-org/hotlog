'use client'

import { AddCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
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

          <fieldset disabled={service.draftLocked} className='space-y-4 py-2'>
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

            <Field>
              <FieldLabel>{service.t('visibility.label')}</FieldLabel>
              <FieldControl>
                <div className='space-y-2'>
                  {service.selectedRoleIds.length === 0 ? (
                    <Badge variant='secondary' className='text-xs'>
                      {service.t('visibility.publicDescription')}
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-xs'>
                      {service.t('visibility.restricted', {
                        count: service.selectedRoleIds.length,
                      })}
                    </Badge>
                  )}
                  <div className='max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2'>
                    {service.roles.length === 0 ? (
                      <p className='text-xs text-muted-foreground'>
                        {service.t('visibility.noRoles')}
                      </p>
                    ) : (
                      service.roles.map((role) => (
                        <label
                          key={role.id}
                          className='flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent'
                        >
                          <Checkbox
                            checked={service.selectedRoleIds.includes(role.id)}
                            onChange={() => service.toggleRole(role.id)}
                          />
                          <span>
                            {role.name === 'Owner'
                              ? service.t('visibility.owner')
                              : role.name === 'Admin'
                                ? service.t('visibility.admin')
                                : role.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </FieldControl>
            </Field>
          </fieldset>
          {service.error && (
            <p role='alert' className='text-sm text-destructive'>
              {service.error}
            </p>
          )}

          <DialogFooter className='flex flex-row items-center justify-end gap-2'>
            <Button variant='ghost' onClick={() => service.setOpen(false)}>
              {service.t('create.cancel')}
            </Button>
            <Button
              onClick={service.handleSubmit}
              disabled={
                !service.name.trim() ||
                service.isCreating ||
                service.submitBlocked
              }
            >
              {service.t('create.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  )
}
