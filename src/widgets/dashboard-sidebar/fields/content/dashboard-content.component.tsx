'use client'

import { Link } from '@/i18n/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/shared/ui/sidebar'
import { CircleIcon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { DashboardSidebarFooterComponent } from '../footer'
import { DashboardSidebarHeaderComponent } from '../header'
import { DashboardSidebarContentConstants } from './dashboard-content.constant'
import { useDashboardSidebarContentService } from './dashboard-content.service'

const DashboardSidebarContentComponent = () => {
  const service = useDashboardSidebarContentService()

  return (
    <Sidebar>
      <SidebarHeader>
        <DashboardSidebarHeaderComponent />
      </SidebarHeader>
      <SidebarContent>
        {/* Navigation Links */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {DashboardSidebarContentConstants.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton>
                      <HugeiconsIcon
                        icon={item.icon}
                        size={20}
                        className='text-muted-foreground'
                      />
                      <span>{service.t(`navigation.${item.key}`)}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboards/Groups */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {service.dashboards.map((dashboard) => (
                <SidebarMenuItem key={dashboard.id}>
                  <Link href={`/dashboard/groups/${dashboard.id}`}>
                    <SidebarMenuButton>
                      <HugeiconsIcon
                        icon={CircleIcon}
                        size={16}
                        color={dashboard.color}
                      />
                      <span>{dashboard.name}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton className='text-muted-foreground'>
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  <span>{service.t('groups.addNew')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DashboardSidebarFooterComponent />
      </SidebarFooter>
    </Sidebar>
  )
}

export default DashboardSidebarContentComponent
