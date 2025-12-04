'use client'

import { ERoutes } from '@/config/routes'
import { Link } from '@/i18n/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumbb'
import { SidebarTrigger } from '@/shared/ui/sidebar'
import React from 'react'
import { useDashboardSidebarNavbarService } from './dashboard-sidebar-navbar.service'

const DashboardSidebarNavbarComponent = () => {
  const service = useDashboardSidebarNavbarService()

  return (
    <div className='px-4 p-2 h-16 flex justify-between'>
      <div className='w-full flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              {service.pathSegments.map((segment, index) => {
                const href =
                  ERoutes.DASHBOARD +
                  '/' +
                  service.pathSegments.slice(1, index + 1).join('/')
                const isLast = index === service.pathSegments.length - 1
                const isFirst = index === 0

                return (
                  <React.Fragment key={href}>
                    {!isFirst && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{segment}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink className='hover:underline' asChild>
                          <Link href={href}>{segment}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {service.extraComponent}
      </div>
    </div>
  )
}

export default DashboardSidebarNavbarComponent
