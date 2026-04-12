'use client'

import { UserAdd01Icon } from '@hugeicons/core-free-icons'
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

import type { RoleOption } from '../../../overview.interface'
import type { TFunction } from '../../../overview.service'
import { useInviteMemberModalService } from './invite-member.modal.service'

export interface InviteMemberModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (email: string, roleId?: string) => void
  roleOptions: RoleOption[]
  t: TFunction
}

export function InviteMemberModal(props: InviteMemberModalProps) {
  const service = useInviteMemberModalService(props)

  return (
    <Dialog open={props.open} onOpenChange={(state) => !state && props.onClose()}>
      <DialogContent>
        <DialogHeader className='space-y-2'>
          <DialogTitle className='flex items-center gap-2'>
            <HugeiconsIcon icon={UserAdd01Icon} className='size-5' />
            {props.t('users.inviteModal.title')}
          </DialogTitle>
          <DialogDescription>
            {props.t('users.inviteModal.description')}
          </DialogDescription>
        </DialogHeader>

        <Field className='space-y-2'>
          <FieldLabel>{props.t('users.inviteModal.emailLabel')}</FieldLabel>
          <FieldControl>
            <Input
              value={service.email}
              onChange={(event) => service.setEmail(event.target.value)}
              placeholder={props.t('users.inviteModal.placeholder')}
              type='email'
            />
          </FieldControl>
          {service.error ? (
            <FieldMessage state='error'>{service.error}</FieldMessage>
          ) : (
            <FieldMessage>{props.t('users.inviteModal.help')}</FieldMessage>
          )}
        </Field>

        <Field className='space-y-2'>
          <FieldLabel>{props.t('users.inviteModal.roleLabel')}</FieldLabel>
          <FieldControl>
            <select
              value={service.roleId}
              onChange={(event) => service.setRoleId(event.target.value)}
              className='flex h-9 w-full rounded-md border border-border/70 bg-muted/40 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            >
              <option value=''>{props.t('users.inviteModal.noRole')}</option>
              {props.roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </FieldControl>
        </Field>

        <DialogFooter className='flex flex-row items-center justify-end gap-2 pt-2'>
          <Button variant='ghost' onClick={props.onClose}>
            {props.t('users.inviteModal.cancel')}
          </Button>
          <Button onClick={service.handleSubmit}>
            {props.t('users.inviteModal.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
