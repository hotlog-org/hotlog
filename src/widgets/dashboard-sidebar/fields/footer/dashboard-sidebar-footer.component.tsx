'use client'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar'
import { useDashboardSidebarFooterService } from './dashboard-sidebar-footer.service'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  LogoutSquare01Icon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

const DashboardSidebarFooterComponent = () => {
  const service = useDashboardSidebarFooterService()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className='focus-visible:ring-0' asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='h-full w-full flex flex-col leading-tight'>
                {service.isLoading ? (
                  <Skeleton className='h-full w-full' />
                ) : (
                  <>
                    <span className='truncate text-sm font-medium'>
                      {service.user?.name}
                    </span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {service.user?.email}
                    </span>
                  </>
                )}
              </div>
              {service.isLoading ? (
                <Skeleton className='h-full w-4' />
              ) : (
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56'
            side={service.isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel>
              <div className='flex flex-col leading-tight'>
                <span className='truncate text-sm font-medium'>
                  {service.user?.name}
                </span>
                <span className='truncate text-xs text-muted-foreground'>
                  {service.user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* <DropdownMenuGroup>
              <DropdownMenuItem>
              <BadgeCheck />
              Account
              </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator /> */}
            <DropdownMenuItem onClick={service.handleLogout}>
              <HugeiconsIcon icon={LogoutSquare01Icon} />
              {service.t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default DashboardSidebarFooterComponent
