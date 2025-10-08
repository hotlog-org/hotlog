'use client'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  ArrowDown01Icon,
  PlusSignIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useDashboardSidebarHeaderService } from './dashboard-sidebar-header.service'

const DashboardSidebarHeaderComponent = () => {
  const service = useDashboardSidebarHeaderService()
  const { projects, selectedProject, setSelectedProject } = service

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className='focus-visible:ring-0' asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg'>
                <HugeiconsIcon
                  icon={selectedProject.icon}
                  size={20}
                  color={selectedProject.color}
                />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {selectedProject.name}
                </span>
                <span className='truncate text-xs text-muted-foreground'>
                  {service.t('label')}
                </span>
              </div>

              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className='ml-auto size-4'
              />
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
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                className='gap-2 p-2 cursor-pointer'
                onClick={() => setSelectedProject(project)}
              >
                <div className='flex size-6 items-center justify-center rounded-sm'>
                  <HugeiconsIcon
                    icon={project.icon}
                    size={16}
                    color={project.color}
                  />
                </div>
                <div className='flex-1'>
                  <span className='font-medium'>{project.name}</span>
                </div>
                {project.id === selectedProject.id && (
                  <HugeiconsIcon icon={Tick02Icon} className='ml-auto size-4' />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem className='gap-2 cursor-pointer text-muted-foreground'>
              <div className='flex size-6 items-center justify-center rounded-sm'>
                <HugeiconsIcon icon={PlusSignIcon} size={16} />
              </div>
              <span>{service.t('create')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default DashboardSidebarHeaderComponent
