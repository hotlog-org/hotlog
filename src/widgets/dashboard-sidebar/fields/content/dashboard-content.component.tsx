'use client'

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
import { Skeleton } from '@/shared/ui/skeleton'
import { HugeiconsIcon } from '@hugeicons/react'
import { DashboardSidebarFooterComponent } from '../footer'
import { DashboardSidebarHeaderComponent } from '../header'
import { DashboardSidebarCreateModuleComponent } from './create-module/create-module.component'
import { ModuleRow } from './create-module/module-row.component'
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
              {service.isModulesLoading && service.modules.length === 0
                ? [0, 1, 2].map((index) => (
                    <SidebarMenuItem key={index} aria-hidden='true'>
                      <Skeleton className='h-8 w-full' />
                    </SidebarMenuItem>
                  ))
                : null}
              {service.modules.map((module) => (
                <ModuleRow
                  key={module.id}
                  module={module}
                  sidebarState={service.sidebarState}
                  selectedModuleId={service.selectedModuleId}
                  onDelete={
                    service.canDeleteLayouts ? service.deleteModule : undefined
                  }
                  onSelect={service.setSelectedModuleId}
                />
              ))}
              {service.canCreateLayouts ? (
                <DashboardSidebarCreateModuleComponent
                  sidebarState={service.sidebarState}
                />
              ) : null}
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
