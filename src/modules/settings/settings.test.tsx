import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, PropsWithChildren } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  read: vi.fn(),
  leave: vi.fn(),
  deleteProject: vi.fn(),
  deleteAccount: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}))
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/dashboard/schema',
  useRouter: () => ({
    replace: api.replace,
    push: api.push,
    refresh: api.refresh,
  }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { updateUser: api.updateUser, signOut: api.signOut },
  }),
}))
vi.mock('@/shared/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-a', name: 'Sam', email: 'sam@invalid.test' },
    isLoading: false,
  }),
}))
vi.mock('@/shared/api/user-project/user-project.api', () => ({
  userProjectsQueryApi: api.read,
  deleteProjectApi: api.deleteProject,
  createProjectApi: vi.fn(),
}))
vi.mock('./settings.api', () => ({
  leaveProjectApi: api.leave,
  deleteAccountApi: api.deleteAccount,
}))
vi.mock('@/shared/hooks', () => ({
  useAuth: () => ({
    user: { id: 'user-a', name: 'Sam', email: 'sam@invalid.test' },
    isLoading: false,
  }),
  useIsMobile: () => false,
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
import DashboardSidebarFooterComponent from '@/widgets/dashboard-sidebar/fields/footer/dashboard-sidebar-footer.component'
import { useSettingsService } from './settings.service'
import { SettingsDialog } from './settings.component'
import { EUserProjectKey, type IUserProjectDto } from '@/shared/api/interface'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useModulesStore } from '@/modules/modules/modules.store'

const owner = {
  id: 'owner-project',
  name: 'Owned project',
  isCreator: true,
  canDelete: true,
  createdAt: '',
}
const member = {
  id: 'joined-project',
  name: 'Joined project',
  isCreator: false,
  canDelete: false,
  createdAt: '',
}
let serverProjects: IUserProjectDto[]
beforeEach(() => {
  serverProjects = [owner, member]
  api.read.mockImplementation(async () => ({ data: serverProjects }))
  api.leave.mockImplementation(async (id: string) => {
    serverProjects = serverProjects.filter((item) => item.id !== id)
  })
  api.deleteProject.mockImplementation(async (id: string) => {
    serverProjects = serverProjects.filter((item) => item.id !== id)
  })
  api.deleteAccount.mockResolvedValue(undefined)
  api.updateUser.mockResolvedValue({
    data: { user: { id: 'user-a' } },
    error: null,
  })
  api.signOut.mockResolvedValue({ error: null })
  useDashboardProject.setState({ selectedProjectId: member.id })
  useModulesStore.setState({ selectedModuleId: 'old-module' })
})
function setup(projects = serverProjects, seed = true) {
  serverProjects = projects
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  if (seed)
    client.setQueryData([EUserProjectKey.USER_PROJECTS_QUERY], {
      data: projects,
    })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const close = vi.fn()
  return { client, wrapper, close }
}
it('updates display-name metadata and reports success only after the real write', async () => {
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  act(() => result.current.updateName('  New name  '))
  await act(() => result.current.saveName())
  expect(api.updateUser).toHaveBeenCalledExactlyOnceWith({
    data: { username: 'New name' },
  })
  expect(result.current.saved).toBe(true)
  expect(result.current.name).toBe('New name')
})
it('keeps the name draft and exposes a failed profile save', async () => {
  api.updateUser.mockResolvedValue({
    data: {},
    error: new Error('Name failed'),
  })
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  act(() => result.current.updateName('Draft'))
  await act(() => result.current.saveName())
  expect(result.current.name).toBe('Draft')
  expect(result.current.saved).toBe(false)
  expect(result.current.error).toBe('Name failed')
})
it('validates names without a write', async () => {
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  act(() => result.current.updateName('x'.repeat(81)))
  await act(() => result.current.saveName())
  expect(api.updateUser).not.toHaveBeenCalled()
  expect(result.current.error).toBe('nameInvalid')
})
it('blocks account deletion while owned projects remain and blocks owner self-leave', () => {
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  act(() => result.current.requestConfirmation({ kind: 'account' }))
  expect(result.current.confirmation).toBeNull()
  act(() =>
    result.current.requestConfirmation({ kind: 'leave', project: owner }),
  )
  expect(result.current.confirmation).toBeNull()
})
it('requires delete capability, not merely being a member', () => {
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('projects', close), {
    wrapper,
  })
  act(() =>
    result.current.requestConfirmation({ kind: 'delete', project: member }),
  )
  expect(result.current.confirmation).toBeNull()
})
it('leaves only after matching confirmation, evicts project data and selects a remaining project', async () => {
  const { wrapper, close, client } = setup()
  client.setQueryData(['layouts_query', member.id], {
    data: ['private-project-content'],
  })
  const { result } = renderHook(() => useSettingsService('projects', close), {
    wrapper,
  })
  act(() =>
    result.current.requestConfirmation({ kind: 'leave', project: member }),
  )
  await act(() => result.current.confirmAction())
  expect(api.leave).not.toHaveBeenCalled()
  act(() => result.current.setConfirmationText(member.name))
  await act(() => result.current.confirmAction())
  expect(api.leave).toHaveBeenCalledExactlyOnceWith(member.id)
  expect(useDashboardProject.getState().selectedProjectId).toBe(owner.id)
  expect(useModulesStore.getState().selectedModuleId).toBeNull()
  expect(client.getQueryData(['layouts_query', member.id])).toBeUndefined()
  expect(result.current.projects).toEqual([owner])
  expect(result.current.confirmation).toBeNull()
})
it('keeps confirmation, selection and cached data on a failed leave', async () => {
  api.leave.mockRejectedValueOnce(new Error('Leave failed'))
  const { wrapper, close, client } = setup()
  client.setQueryData(['layouts_query', member.id], { data: ['keep'] })
  const { result } = renderHook(() => useSettingsService('projects', close), {
    wrapper,
  })
  act(() =>
    result.current.requestConfirmation({ kind: 'leave', project: member }),
  )
  act(() => result.current.setConfirmationText(member.name))
  await act(() => result.current.confirmAction())
  expect(result.current.error).toBe('Leave failed')
  expect(result.current.confirmation?.kind).toBe('leave')
  expect(useDashboardProject.getState().selectedProjectId).toBe(member.id)
  expect(client.getQueryData(['layouts_query', member.id])).toEqual({
    data: ['keep'],
  })
})
it('blocks same-tick duplicate actions, tab changes, switching and closure during a pending leave', async () => {
  let resolve!: () => void
  api.leave.mockReturnValueOnce(
    new Promise<void>((yes) => {
      resolve = yes
    }),
  )
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('projects', close), {
    wrapper,
  })
  act(() =>
    result.current.requestConfirmation({ kind: 'leave', project: member }),
  )
  act(() => result.current.setConfirmationText(member.name))
  let pending!: Promise<void>
  act(() => {
    pending = result.current.confirmAction()
    void result.current.confirmAction()
    result.current.close()
    result.current.switchProject(owner)
    result.current.changeTab('account')
  })
  expect(api.leave).toHaveBeenCalledTimes(1)
  expect(close).not.toHaveBeenCalled()
  expect(result.current.tab).toBe('projects')
  await act(async () => {
    serverProjects = [owner]
    resolve()
    await pending
  })
})
it('does not overwrite a newer project selection when a leave completes', async () => {
  let resolve!: () => void
  api.leave.mockReturnValueOnce(
    new Promise<void>((yes) => {
      resolve = yes
    }),
  )
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('projects', close), {
    wrapper,
  })
  act(() =>
    result.current.requestConfirmation({ kind: 'leave', project: member }),
  )
  act(() => result.current.setConfirmationText(member.name))
  let pending!: Promise<void>
  act(() => {
    pending = result.current.confirmAction()
  })
  act(() => useDashboardProject.setState({ selectedProjectId: owner.id }))
  await act(async () => {
    serverProjects = [owner]
    resolve()
    await pending
  })
  expect(useDashboardProject.getState().selectedProjectId).toBe(owner.id)
  expect(api.replace).not.toHaveBeenCalled()
})
it('deletes an authorized project without altering an unrelated current selection', async () => {
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('projects', close), {
    wrapper,
  })
  act(() =>
    result.current.requestConfirmation({ kind: 'delete', project: owner }),
  )
  act(() => result.current.setConfirmationText(owner.name))
  await act(() => result.current.confirmAction())
  expect(api.deleteProject).toHaveBeenCalledExactlyOnceWith(owner.id)
  expect(useDashboardProject.getState().selectedProjectId).toBe(member.id)
})
it('does not clear the account on a failed account deletion', async () => {
  api.deleteAccount.mockRejectedValueOnce(new Error('Not configured'))
  const { wrapper, close, client } = setup([member])
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  act(() => result.current.requestConfirmation({ kind: 'account' }))
  act(() => result.current.setConfirmationText('sam@invalid.test'))
  await act(() => result.current.confirmAction())
  expect(result.current.error).toBe('Not configured')
  expect(
    client.getQueryData([EUserProjectKey.USER_PROJECTS_QUERY]),
  ).toBeTruthy()
  expect(api.signOut).not.toHaveBeenCalled()
  expect(close).not.toHaveBeenCalled()
})
it('clears project/user caches and navigates to sign-in only after confirmed account deletion', async () => {
  const { wrapper, close, client } = setup([member])
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  act(() => result.current.requestConfirmation({ kind: 'account' }))
  act(() => result.current.setConfirmationText('sam@invalid.test'))
  await act(() => result.current.confirmAction())
  expect(api.deleteAccount).toHaveBeenCalledExactlyOnceWith('sam@invalid.test')
  expect(api.signOut).toHaveBeenCalledWith({ scope: 'local' })
  expect(
    client.getQueryData([EUserProjectKey.USER_PROJECTS_QUERY]),
  ).toBeUndefined()
  expect(useDashboardProject.getState().selectedProjectId).toBeUndefined()
  expect(api.replace).toHaveBeenCalledWith('/sign-in')
  expect(api.refresh).toHaveBeenCalled()
})
it('keeps caches and navigation intact if logout fails', async () => {
  api.signOut.mockResolvedValueOnce({ error: new Error('Sign out failed') })
  const { wrapper, close, client } = setup()
  client.setQueryData(['private'], { data: 'keep' })
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  await act(() => result.current.logout())
  expect(result.current.error).toBe('Sign out failed')
  expect(client.getQueryData(['private'])).toEqual({ data: 'keep' })
  expect(api.replace).not.toHaveBeenCalled()
  expect(close).not.toHaveBeenCalled()
})

it('logs out from settings, clears private caches and closes the dialog', async () => {
  const { wrapper, close, client } = setup()
  client.setQueryData(['private'], { data: 'clear' })
  const { result } = renderHook(() => useSettingsService('account', close), {
    wrapper,
  })
  await act(() => result.current.logout())
  expect(api.signOut).toHaveBeenCalledExactlyOnceWith()
  expect(client.getQueryData(['private'])).toBeUndefined()
  expect(useDashboardProject.getState().selectedProjectId).toBeUndefined()
  expect(api.replace).toHaveBeenCalledWith('/')
  expect(close).toHaveBeenCalled()
})

it('preserves the current path, query and fragment when changing language', () => {
  window.history.replaceState({}, '', '/en/dashboard/schema?search=order#field')
  const { wrapper, close } = setup()
  const { result } = renderHook(() => useSettingsService('language', close), {
    wrapper,
  })
  act(() => result.current.changeLanguage('invalid'))
  expect(api.replace).not.toHaveBeenCalled()
  act(() => result.current.changeLanguage('ru'))
  expect(api.replace).toHaveBeenCalledWith(
    '/dashboard/schema?search=order#field',
    { locale: 'ru' },
  )
})
it('renders owner protection and project actions and supports keyboard settings navigation', () => {
  const { wrapper, close } = setup()
  render(<SettingsDialog onClose={close} />, { wrapper })
  expect(screen.getByRole('button', { name: 'deleteAccount' })).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('tab', { name: 'tabs.account' }), {
    key: 'End',
  })
  expect(screen.getByRole('tab', { name: 'tabs.projects' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getByText(owner.name)).toBeInTheDocument()
  expect(screen.getByText('ownerCannotLeave')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'leaveProject' })).toHaveLength(
    1,
  )
  expect(screen.getAllByRole('button', { name: 'deleteProject' })).toHaveLength(
    1,
  )
})
it('opens real settings directly from the account row and restores focus on close', async () => {
  const { wrapper } = setup()
  render(<DashboardSidebarFooterComponent />, { wrapper })
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'settings' })
  await user.click(trigger)
  expect(screen.queryByRole('menu')).toBeNull()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'tabs.account' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(trigger).toHaveFocus())
  await user.click(trigger)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('displays project fetch failure rather than an empty successful list', async () => {
  api.read.mockRejectedValue(new Error('Projects unavailable'))
  const { wrapper, close } = setup([], false)
  render(<SettingsDialog initialTab='projects' onClose={close} />, { wrapper })
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Projects unavailable',
  )
  expect(screen.queryByText('noProjects')).toBeNull()
})
