import { ERoutes } from '@/config/routes'
import {
  FolderViewIcon,
  Home04Icon,
  SchemeIcon,
} from '@hugeicons/core-free-icons'

const DashboardSidebarContentConstants = [
  {
    href: ERoutes.DASHBOARD,
    key: 'overview',
    icon: Home04Icon,
  },
  {
    href: ERoutes.DASHBOARD_EVENTS,
    key: 'events',
    icon: FolderViewIcon,
  },
  {
    href: ERoutes.DASHBOARD_SCHEMA,
    key: 'schema',
    icon: SchemeIcon,
  },
]

export { DashboardSidebarContentConstants }
