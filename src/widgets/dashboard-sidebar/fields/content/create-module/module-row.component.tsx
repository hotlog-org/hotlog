'use client'

import { ERoutes } from '@/config/routes'
import { Link } from '@/i18n/navigation'
import { Delete02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { CircleIcon } from '@hugeicons/core-free-icons'
import { SidebarMenuButton, SidebarMenuItem } from '@/shared/ui/sidebar'
import { cn } from '@/shared/utils/shadcn.utils'
import type { ModuleDefinition } from '@/modules/modules/modules.interface'

export interface ModuleRowProps {
  module: ModuleDefinition
  sidebarState: string
  selectedModuleId: string | null
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

export const ModuleRow = (props: ModuleRowProps) => {
  const isCollapsed = props.sidebarState === 'collapsed'
  const active = props.selectedModuleId === props.module.id

  return (
    <SidebarMenuItem>
      <div className='group relative'>
        <Link href={`${ERoutes.DASHBOARD_MODULES}/${props.module.id}`}>
          <SidebarMenuButton
            tooltip={props.module.name}
            className={cn(
              isCollapsed && 'flex items-center justify-center',
              active && 'bg-accent',
            )}
            aria-current={active ? 'page' : undefined}
            onClick={() => props.onSelect(props.module.id)}
          >
            <HugeiconsIcon
              icon={CircleIcon}
              className='size-4'
              color={props.module.color}
            />
            {!isCollapsed && <span>{props.module.name}</span>}
          </SidebarMenuButton>
        </Link>

        {!isCollapsed ? (
          <button
            className='absolute right-2 top-1/2 hidden -translate-y-1/2 p-1 text-destructive opacity-0 transition group-hover:block group-hover:opacity-100 hover:text-white'
            aria-label='Delete module'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              props.onDelete(props.module.id)
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} className='size-4' />
          </button>
        ) : null}
      </div>
    </SidebarMenuItem>
  )
}
