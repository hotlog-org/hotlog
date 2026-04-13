import { useMemo } from 'react'

import { usePathname } from '@/i18n/navigation'
import { useLayoutsQuery } from '@/shared/api/layout'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useDashboardNavbarExtra } from '../../../../shared/store/dashboard-navbar-extra.store'

export const useDashboardSidebarNavbarService = () => {
  const pathname = usePathname()
  const rawSegments = pathname.split('/').filter(Boolean)
  const extraComponent = useDashboardNavbarExtra((s) => s.component)
  const selectedProjectId = useDashboardProject(
    (state) => state.selectedProjectId,
  )
  const layoutsQuery = useLayoutsQuery(selectedProjectId)

  const pathSegments = useMemo(() => {
    const modulesIndex = rawSegments.indexOf('modules')
    if (modulesIndex === -1 || modulesIndex + 1 >= rawSegments.length) {
      return rawSegments
    }

    const moduleId = rawSegments[modulesIndex + 1]
    const layout = layoutsQuery.data?.data?.find(
      (l) => String(l.id) === moduleId,
    )

    if (!layout) return rawSegments

    return rawSegments.map((segment, i) =>
      i === modulesIndex + 1 ? layout.name : segment,
    )
  }, [rawSegments, layoutsQuery.data])

  return {
    pathSegments,
    rawSegments,
    pathname,
    extraComponent,
  }
}
