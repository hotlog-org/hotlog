'use client'

import { useState } from 'react'
import { ERoutes } from '@/config/routes'
import { Link } from '@/i18n/navigation'
import { Delete02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { CircleIcon } from '@hugeicons/core-free-icons'
import { SidebarMenuButton, SidebarMenuItem } from '@/shared/ui/sidebar'
import { cn } from '@/shared/utils/shadcn.utils'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

interface SidebarModule {
  id: string
  name: string
  color: string
}

export interface ModuleRowProps {
  module: SidebarModule
  sidebarState: string
  selectedModuleId: string | null
  onDelete?: (id: string) => void
  onSelect: (id: string) => void
}

export const ModuleRow = (props: ModuleRowProps) => {
  const isCollapsed = props.sidebarState === 'collapsed'
  const active = props.selectedModuleId === props.module.id
  const [confirmOpen, setConfirmOpen] = useState(false)

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

        {!isCollapsed && props.onDelete ? (
          <button
            className='absolute right-2 top-1/2 hidden -translate-y-1/2 p-1 text-destructive opacity-0 transition group-hover:block group-hover:opacity-100 hover:text-white'
            aria-label='Delete module'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setConfirmOpen(true)
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} className='size-4' />
          </button>
        ) : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{props.module.name}"?</DialogTitle>
            <DialogDescription>
              This will permanently delete this module and all its components.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='flex flex-row items-center justify-end gap-2 pt-2'>
            <Button variant='ghost' onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                props.onDelete?.(props.module.id)
                setConfirmOpen(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  )
}
