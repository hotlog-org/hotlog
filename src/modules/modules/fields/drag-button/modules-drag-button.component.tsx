'use client'

import { Drag03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'

import type { TFunction } from '../../modules.interface'
import { useModulesDragButtonService } from './modules-drag-button.service'

export interface ModulesDragButtonProps {
  active: boolean
  onToggle: () => void
  t: TFunction
}

export const ModulesDragButton = (props: ModulesDragButtonProps) => {
  const service = useModulesDragButtonService(props)

  return (
    <Button
      variant={props.active ? 'secondary' : 'outline'}
      size='icon'
      onClick={props.onToggle}
      aria-pressed={props.active}
      title={service.label}
    >
      <HugeiconsIcon icon={Drag03Icon} className='size-5' />
    </Button>
  )
}
