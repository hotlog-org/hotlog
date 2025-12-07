import { SidebarProvider } from '@/shared/ui/sidebar'
import { DashboardSidebarContentComponent } from './fields/content'
import { DashboardSidebarNavbarComponent } from './fields/navbar'

interface IProps {
  children: React.ReactNode
}

const DashboardSidebarComponent = ({ children }: IProps) => {
  return (
    <SidebarProvider>
      <DashboardSidebarContentComponent />
      <main className='w-full'>
        <DashboardSidebarNavbarComponent />
        <div className='p-4 h-auto w-full'>{children}</div>
      </main>
    </SidebarProvider>
  )
}

export default DashboardSidebarComponent
