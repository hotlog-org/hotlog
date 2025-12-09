'use client'

import { UserAdd01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'

import type { TFunction } from '../../../../overview.service'
import { useUsersActionService } from './users-action.service'

export interface UsersActionProps {
  onInvite: () => void
  t: TFunction
}

export function UsersAction(props: UsersActionProps) {
  const service = useUsersActionService(props)

  return (
    <Button
      size='sm'
      variant='outline'
      className='inline-flex items-center gap-2'
      onClick={service.handleInvite}
    >
      <HugeiconsIcon icon={UserAdd01Icon} className='size-4' />
      {props.t('users.invite')}
    </Button>
  )
}
