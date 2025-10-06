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
import { useDashboardSidebarNavbarService } from './dashboard-sidebar-navbar.service'

const DashboardSidebarNavbarComponent = () => {
  const service = useDashboardSidebarNavbarService()

  return (
    <div className='p-2 h-16 flex justify-between'>
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
                <BreadcrumbItem key={href}>
                  {!isFirst && <BreadcrumbSeparator />}

                  {isLast ? (
                    <BreadcrumbPage>{segment}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink className='hover:underline' asChild>
                      <Link href={href}>{segment}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  )
}

export default DashboardSidebarNavbarComponent
