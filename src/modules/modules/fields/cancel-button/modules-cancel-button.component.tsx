'use client'

import { Button } from '@/shared/ui/button'

import type { TFunction } from '../../modules.interface'
import { useModulesCancelButtonService } from './modules-cancel-button.service'

export interface ModulesCancelButtonProps {
  disabled?: boolean
  onCancel: () => void
  t: TFunction
}

export const ModulesCancelButton = (props: ModulesCancelButtonProps) => {
  const service = useModulesCancelButtonService(props)

  return (
    <Button
      variant='ghost'
      disabled={props.disabled}
      onClick={props.onCancel}
      className='min-w-[96px]'
    >
      {service.label}
    </Button>
  )
}
