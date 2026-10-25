'use client'

import { useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon, UserIcon } from '@hugeicons/core-free-icons'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar'
import { Skeleton } from '@/shared/ui/skeleton'
import { SettingsDialog } from '@/modules/settings/settings.component'
import { useDashboardSidebarFooterService } from './dashboard-sidebar-footer.service'

const DashboardSidebarFooterComponent = () => {
  const service = useDashboardSidebarFooterService()
  const accountTrigger = useRef<HTMLButtonElement>(null)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          ref={accountTrigger}
          size='lg'
          className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-3'
          data-state={service.settingsOpen ? 'open' : 'closed'}
          disabled={service.isLoading || !service.user}
          aria-label={service.t('settings')}
          aria-haspopup='dialog'
          aria-expanded={service.settingsOpen}
          tooltip={service.user?.name || service.t('settings')}
          onClick={service.openSettings}
        >
          {service.sidebarState === 'collapsed' ? (
            <HugeiconsIcon
              icon={UserIcon}
              size={20}
              className='text-muted-foreground'
            />
          ) : (
            <>
              <span
                aria-hidden='true'
                className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-semibold'
              >
                {(service.user?.name || service.user?.email || '?')
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
              <div className='flex min-w-0 flex-1 flex-col leading-tight'>
                {service.isLoading ? (
                  <Skeleton className='h-full w-full' />
                ) : (
                  <>
                    <span className='truncate text-sm font-medium'>
                      {service.user?.name || service.t('settings')}
                    </span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {service.user?.email}
                    </span>
                  </>
                )}
              </div>
              <HugeiconsIcon
                icon={Settings01Icon}
                className='size-4 shrink-0 text-muted-foreground'
                aria-hidden='true'
              />
            </>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
      {service.settingsOpen && service.user && (
        <SettingsDialog
          key={service.user.id}
          onClose={service.closeSettings}
          onCloseFocus={() => accountTrigger.current?.focus()}
        />
      )}
    </SidebarMenu>
  )
}

export default DashboardSidebarFooterComponent
