'use client'

import { Button } from '@/shared/ui/button'

import type { TFunction } from '../../modules.interface'
import { useModulesSaveButtonService } from './modules-save-button.service'

export interface ModulesSaveButtonProps {
  disabled?: boolean
  onSave: () => void
  t: TFunction
}

export const ModulesSaveButton = (props: ModulesSaveButtonProps) => {
  const service = useModulesSaveButtonService(props)

  return (
    <Button
      variant='secondary'
      disabled={props.disabled}
      onClick={props.onSave}
      className='min-w-[96px]'
    >
      {service.label}
    </Button>
  )
}
