'use client'

import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/shared/ui/button'

import type { TFunction } from '../../modules.interface'
import { useModulesSaveButtonService } from './modules-save-button.service'

export interface ModulesSaveButtonProps {
  disabled?: boolean
  saving?: boolean
  onSave: () => void
  t: TFunction
}

export const ModulesSaveButton = (props: ModulesSaveButtonProps) => {
  const service = useModulesSaveButtonService(props)

  return (
    <Button
      variant='secondary'
      disabled={props.disabled}
      aria-busy={props.saving}
      onClick={props.onSave}
      className='min-w-[96px]'
    >
      {props.saving && (
        <HugeiconsIcon
          icon={Loading03Icon}
          className='size-4 animate-spin'
          aria-hidden='true'
        />
      )}
      {service.label}
    </Button>
  )
}
