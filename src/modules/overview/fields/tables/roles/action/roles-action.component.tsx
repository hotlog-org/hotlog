'use client'

import { AddSquareIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'

import type { TFunction } from '../../../../overview.service'
import { useRolesActionService } from './roles-action.service'

export interface RolesActionProps {
  onAdd: () => void
  t: TFunction
}

export function RolesAction(props: RolesActionProps) {
  const service = useRolesActionService(props)

  return (
    <Button
      size='sm'
      variant='outline'
      className='inline-flex items-center gap-2'
      onClick={service.handleAddRole}
    >
      <HugeiconsIcon icon={AddSquareIcon} className='size-4' />
      {props.t('roles.add')}
    </Button>
  )
}
