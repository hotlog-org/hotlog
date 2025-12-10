'use client'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/shared/ui/sidebar'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'

import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'

import {
  ArrowDown02Icon,
  Tick02Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useState } from 'react'
import { useDashboardSidebarHeaderService } from './dashboard-sidebar-header.service'

const DashboardSidebarHeaderComponent = () => {
  const service = useDashboardSidebarHeaderService()
  const { state } = useSidebar()
  const [projectName, setProjectName] = useState('')

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger className='focus-visible:ring-0' asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                tooltip={service.selectedProject?.name}
              >
                {state === 'collapsed' ? (
                  <div className='flex aspect-square size-8 items-center justify-center rounded-lg'>
                    <HugeiconsIcon
                      icon={service.selectedProject?.icon}
                      size={20}
                      color={service.selectedProject?.color}
                    />
                  </div>
                ) : (
                  <>
                    <div className='flex aspect-square size-8 items-center justify-center rounded-lg'>
                      <HugeiconsIcon
                        icon={service.selectedProject?.icon}
                        size={20}
                        color={service.selectedProject?.color}
                      />
                    </div>
                    <div className='grid flex-1 text-left text-sm leading-tight'>
                      <span className='truncate font-semibold'>
                        {service.selectedProject?.name}
                      </span>
                      <span className='truncate text-xs text-muted-foreground'>
                        {service.t('label')}
                      </span>
                    </div>

                    <HugeiconsIcon
                      icon={ArrowDown02Icon}
                      className='ml-auto size-4'
                    />
                  </>
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              align='start'
              side='left'
              sideOffset={4}
            >
              <DropdownMenuLabel className='text-xs text-muted-foreground'>
                {service.t('select')}
              </DropdownMenuLabel>

              {service.projects.map((project, i) => (
                <div className='relative' key={i}>
                  <DropdownMenuItem
                    key={project.id}
                    className='gap-2 p-2 cursor-pointer flex items-center'
                    onClick={() => service.setSelectedProject(project)}
                  >
                    <div className='flex size-6 items-center justify-center rounded-sm'>
                      <HugeiconsIcon
                        style={{ color: project.color }}
                        icon={project.icon}
                        size={16}
                      />
                    </div>

                    <div className='flex-1'>
                      <span className='font-medium'>{project.name}</span>
                    </div>

                    <div className='flex items-center gap-2'>
                      {project.id === service.selectedProject?.id && (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          className='size-4'
                          color={service.selectedProject.color}
                        />
                      )}
                    </div>
                  </DropdownMenuItem>
                </div>
              ))}

              <DropdownMenuItem
                className='gap-2 cursor-pointer text-muted-foreground'
                onClick={() => service.setCreateDialogOpen(true)}
              >
                <div className='flex size-6 items-center justify-center rounded-sm'>
                  <HugeiconsIcon icon={PlusSignIcon} className='size-4' />
                </div>
                <span>{service.t('create')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog
        open={service.createDialogOpen}
        onOpenChange={service.setCreateDialogOpen}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{service.t('createProject')}</DialogTitle>
          </DialogHeader>

          <form
            className='space-y-4'
            onSubmit={(e) => {
              e.preventDefault()
              service.handleCreateProject(projectName)
              service.setCreateDialogOpen(false)
              setProjectName('')
            }}
          >
            <Input
              placeholder={service.t('placeholder.name')}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />

            <DialogFooter>
              <Button variant='outline' type='submit'>
                {service.t('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default DashboardSidebarHeaderComponent
