import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  envClient: { NEXT_PUBLIC_CLIENT_API_URL: 'https://hotlog.invalid/api' },
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
import { useDashboardSidebarHeaderService } from './dashboard-sidebar-header.service'
import { EUserProjectKey } from '@/shared/api/interface'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'

it('keeps project creation dialog/selection on HTTP failure and returns false to retain the form draft', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const projects = {
    data: [{ id: 'p', name: 'Original', createdAt: '', isCreator: true }],
  }
  client.setQueryData([EUserProjectKey.USER_PROJECTS_QUERY], projects)
  useDashboardProject.setState({ selectedProjectId: 'p' })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useDashboardSidebarHeaderService, { wrapper })
  act(() => result.current.setCreateDialogOpen(true))
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ error: { message: 'Create denied' } }, { status: 403 }),
  )
  await act(async () => {
    expect(await result.current.handleCreateProject('Draft')).toBe(false)
  })
  await waitFor(() => expect(result.current.createError).toBe('Create denied'))
  expect(result.current.createDialogOpen).toBe(true)
  expect(useDashboardProject.getState().selectedProjectId).toBe('p')
  expect(client.getQueryData([EUserProjectKey.USER_PROJECTS_QUERY])).toEqual(
    projects,
  )
  client.clear()
})
