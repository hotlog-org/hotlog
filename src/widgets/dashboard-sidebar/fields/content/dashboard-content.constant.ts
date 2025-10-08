import { ERoutes } from '@/config/routes'
import {
  Flag03Icon,
  FolderViewIcon,
  Home04Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'

const DashboardSidebarContentConstants = [
  {
    href: ERoutes.DASHBOARD,
    key: 'overview',
    icon: Home04Icon,
  },
  {
    href: ERoutes.DASHBOARD_RECORDINGS,
    key: 'recordings',
    icon: FolderViewIcon,
  },
  {
    href: ERoutes.DASHBOARD_IDENTITIES,
    key: 'identities',
    icon: UserIcon,
  },
  {
    href: ERoutes.DASHBOARD_FLAGS,
    key: 'flags',
    icon: Flag03Icon,
  },
]

export { DashboardSidebarContentConstants }
