'use client'

import { ERoutes } from '@/config/routes'
import { Link } from '@/i18n/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar'
import { cn } from '@/shared/utils/shadcn.utils'
import { CircleIcon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { DashboardSidebarFooterComponent } from '../footer'
import { DashboardSidebarHeaderComponent } from '../header'
import { DashboardSidebarContentConstants } from './dashboard-content.constant'
import { useDashboardSidebarContentService } from './dashboard-content.service'

const DashboardSidebarContentComponent = () => {
  const service = useDashboardSidebarContentService()

  return (
    <Sidebar collapsible='icon'>
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
                    <SidebarMenuButton
                      tooltip={service.t(`navigation.${item.key}`)}
                      className={cn(
                        service.sidebarState == 'collapsed' &&
                          'flex items-center justify-center',
                      )}
                    >
                      {service.sidebarState === 'collapsed' ? (
                        <HugeiconsIcon
                          icon={item.icon}
                          size={20}
                          className='text-muted-foreground'
                        />
                      ) : (
                        <>
                          <HugeiconsIcon
                            icon={item.icon}
                            size={20}
                            className='text-muted-foreground'
                          />
                          <span>{service.t(`navigation.${item.key}`)}</span>
                        </>
                      )}
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
            <SidebarGroupLabel>{service.t('groups.label')}</SidebarGroupLabel>
            <SidebarMenu>
              {service.dashboards.map((dashboard) => (
                <SidebarMenuItem key={dashboard.id}>
                  <Link href={`${ERoutes.DASHBOARD_GROUP}/${dashboard.id}`}>
                    <SidebarMenuButton
                      tooltip={dashboard.name}
                      className={cn(
                        service.sidebarState == 'collapsed' &&
                          'flex items-center justify-center',
                      )}
                    >
                      {service.sidebarState === 'collapsed' ? (
                        <HugeiconsIcon
                          icon={CircleIcon}
                          size={16}
                          color={dashboard.color}
                        />
                      ) : (
                        <>
                          <HugeiconsIcon
                            icon={CircleIcon}
                            size={16}
                            color={dashboard.color}
                          />
                          <span>{dashboard.name}</span>
                        </>
                      )}
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={cn(
                    'text-muted-foreground',
                    service.sidebarState == 'collapsed' &&
                      'flex items-center justify-center',
                  )}
                  tooltip={service.t('groups.addNew')}
                >
                  {service.sidebarState === 'collapsed' ? (
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  ) : (
                    <>
                      <HugeiconsIcon icon={PlusSignIcon} size={16} />
                      <span>{service.t('groups.addNew')}</span>
                    </>
                  )}
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
