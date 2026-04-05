'use client'

import { Alert02Icon } from '@hugeicons/core-free-icons'
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
import {
  Field,
  FieldControl,
  FieldLabel,
  FieldMessage,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

import type { TFunction } from '../../../overview.service'
import { useDeleteProjectModalService } from './delete-project.modal.service'

export interface DeleteProjectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  projectName: string
  isDeleting: boolean
  t: TFunction
}

export function DeleteProjectModal(props: DeleteProjectModalProps) {
  const service = useDeleteProjectModalService({
    open: props.open,
    projectName: props.projectName,
    onSubmit: props.onSubmit,
  })

  return (
    <Dialog
      open={props.open}
      onOpenChange={(state) => !state && props.onClose()}
    >
      <DialogContent>
        <DialogHeader className='space-y-2'>
          <DialogTitle className='flex items-center gap-2 text-destructive'>
            <HugeiconsIcon icon={Alert02Icon} className='size-5' />
            Delete project
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the project{' '}
            <span className='font-semibold text-foreground'>
              {props.projectName}
            </span>{' '}
            and all its data, including roles, members, schemas, and events.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <Field className='space-y-2'>
          <FieldLabel>
            Type{' '}
            <span className='font-mono text-foreground'>{props.projectName}</span>{' '}
            to confirm
          </FieldLabel>
          <FieldControl>
            <Input
              value={service.confirmation}
              onChange={(event) => service.setConfirmation(event.target.value)}
              placeholder={props.projectName}
              autoComplete='off'
            />
          </FieldControl>
          {service.error && (
            <FieldMessage state='error'>{service.error}</FieldMessage>
          )}
        </Field>

        <DialogFooter className='flex items-center justify-end gap-2 pt-2 sm:space-x-0'>
          <Button
            variant='ghost'
            onClick={props.onClose}
            disabled={props.isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={service.handleSubmit}
            disabled={!service.isMatching || props.isDeleting}
          >
            {props.isDeleting ? 'Deleting...' : 'Delete project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
