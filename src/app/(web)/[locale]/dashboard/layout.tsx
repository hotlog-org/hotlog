import { DashboardSidebarComponent } from '@/widgets/dashboard-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardSidebarComponent children={children} />
}
