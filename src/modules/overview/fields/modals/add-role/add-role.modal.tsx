'use client'

import { AddSquareIcon, Shield02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Field, FieldControl, FieldLabel, FieldMessage } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'

import type { OverviewPermission, PermissionCategory } from '../../../overview.interface'
import type { TFunction } from '../../../overview.service'
import { useAddRoleModalService } from './add-role.modal.service'

export interface AddRoleModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: { name: string; permissionIds: string[] }) => void
  permissions: OverviewPermission[]
  permissionColors: Record<PermissionCategory | string, string>
  t: TFunction
}

export function AddRoleModal(props: AddRoleModalProps) {
  const service = useAddRoleModalService(props)

  return (
    <Dialog open={props.open} onOpenChange={(state) => !state && props.onClose()}>
      <DialogContent className='max-w-xl'>
        <DialogHeader className='space-y-2'>
          <DialogTitle className='flex items-center gap-2'>
            <HugeiconsIcon icon={Shield02Icon} className='size-5' />
            {props.t('roles.modal.title')}
          </DialogTitle>
          <DialogDescription>
            {props.t('roles.modal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <Field className='space-y-2'>
            <FieldLabel>{props.t('roles.modal.nameLabel')}</FieldLabel>
            <FieldControl>
              <Input
                value={service.name}
                onChange={(event) => service.setName(event.target.value)}
                placeholder={props.t('roles.modal.namePlaceholder')}
              />
            </FieldControl>
          </Field>

          <div className='space-y-2'>
            <p className='text-sm font-medium text-foreground'>
              {props.t('roles.modal.selected')}
            </p>
            <div className='flex min-h-[56px] flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/5 p-3'>
              {service.permissionIds.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  {props.t('roles.modal.empty')}
                </p>
              ) : (
                service.permissionIds.map((id) => {
                  const permission = props.permissions.find(
                    (candidate) => candidate.id === id,
                  )
                  if (!permission) return null
                  return (
                    <span
                      key={id}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${props.permissionColors[permission.category]}`}
                    >
                      <span>
                        {permission.category}/{permission.label}
                      </span>
                      <button
                        type='button'
                        onClick={() => service.togglePermission(id)}
                        className='text-white/70 transition hover:scale-105 hover:text-white'
                        aria-label={props.t('roles.modal.removePermission')}
                      >
                        ×
                      </button>
                    </span>
                  )
                })
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <FieldLabel>{props.t('roles.modal.permissionsLabel')}</FieldLabel>
            <FieldControl>
              <Input
                value={service.search}
                onChange={(event) => service.setSearch(event.target.value)}
                placeholder={props.t('roles.modal.searchPermissions')}
              />
            </FieldControl>
            <ScrollArea className='max-h-64 rounded-lg border border-border/60 bg-muted/5'>
              <div className='divide-y divide-border/60'>
                {service.filteredPermissions.map((permission) => {
                  const active = service.permissionIds.includes(permission.id)
                  return (
                    <button
                      type='button'
                      key={permission.id}
                      onClick={() => service.togglePermission(permission.id)}
                      className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition hover:bg-accent/40 ${
                        active ? 'bg-accent/60' : ''
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${props.permissionColors[permission.category]}`}
                        >
                          {permission.category}/{permission.label}
                        </span>
                      </div>
                      {active ? (
                        <span className='text-xs text-foreground'>
                          {props.t('roles.modal.added')}
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
                          <HugeiconsIcon icon={AddSquareIcon} className='size-4' />
                          {props.t('roles.modal.addPermission')}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
            {service.error && (
              <FieldMessage state='error'>{service.error}</FieldMessage>
            )}
          </div>
        </div>

        <DialogFooter className='flex items-center justify-end gap-2 pt-2 sm:space-x-0'>
          <Button variant='ghost' onClick={props.onClose}>
            {props.t('roles.modal.cancel')}
          </Button>
          <Button onClick={service.handleSubmit}>
            {props.t('roles.modal.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
