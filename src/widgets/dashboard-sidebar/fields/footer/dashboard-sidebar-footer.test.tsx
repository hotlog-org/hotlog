import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, PropsWithChildren } from 'react'
import { expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/shared/hooks', () => ({
  useAuth: () => ({
    user: { id: 'user-a', name: 'Sam', email: 'sam@invalid.test' },
    isLoading: false,
  }),
}))
vi.mock('@/shared/ui/sidebar', () => ({
  useSidebar: () => ({ state: 'expanded' }),
  SidebarMenu: (props: ComponentProps<'ul'>) => <ul {...props} />,
  SidebarMenuItem: (props: ComponentProps<'li'>) => <li {...props} />,
  SidebarMenuButton: (
    props: ComponentProps<'button'> & { tooltip?: string; size?: string },
  ) => {
    const buttonProps = { ...props }
    delete buttonProps.tooltip
    delete buttonProps.size
    return <button {...buttonProps} />
  },
}))
vi.mock('@/modules/settings/settings.component', () => ({
  SettingsDialog: ({ onClose }: { onClose: () => void }) => (
    <div role='dialog'>
      <span>account</span>
      <button onClick={onClose}>Close settings</button>
    </div>
  ),
}))
import DashboardSidebarFooterComponent from './dashboard-sidebar-footer.component'

it('opens Account settings immediately when the account row is clicked', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  render(<DashboardSidebarFooterComponent />, { wrapper })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'settings' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('account')
  expect(screen.queryByRole('menu')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Close settings' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
