import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  assign: vi.fn(),
  read: vi.fn(),
  select: vi.fn(),
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/shared/api/layout', () => ({
  useCreateLayoutMutation: () => ({ mutateAsync: mocks.create }),
  useAddRoleLayoutMutation: () => ({ mutateAsync: mocks.assign }),
}))
vi.mock('@/shared/api/layout/layout.api', () => ({
  layoutsQueryApi: mocks.read,
}))
vi.mock('@/shared/api/project-role/project-role.hook', () => ({
  useProjectRolesQuery: () => ({ data: undefined }),
}))
vi.mock('@/modules/modules/modules.store', () => ({
  useModulesStore: (
    select: (state: { setSelectedModuleId: typeof mocks.select }) => unknown,
  ) => select({ setSelectedModuleId: mocks.select }),
}))
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useDashboardSidebarCreateModuleService } from './create-module.service'

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    () => useDashboardSidebarCreateModuleService({ sidebarState: 'expanded' }),
    { wrapper },
  )
  act(() => {
    hook.result.current.setOpen(true)
    hook.result.current.setName('Draft')
    hook.result.current.toggleRole('r1')
    hook.result.current.toggleRole('r2')
  })
  return { ...hook, client }
}

beforeEach(() => {
  useDashboardProject.setState({ selectedProjectId: 'p' })
  mocks.create.mockResolvedValue({ data: { id: 7 } })
  mocks.assign.mockReset()
  mocks.read.mockReset()
})

describe('module creation partial failure', () => {
  it('keeps draft/modal and retries only remaining roles after confirmed partial creation', async () => {
    mocks.assign
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Denied'))
      .mockResolvedValueOnce(undefined)
    mocks.read.mockResolvedValue({ data: [{ id: 7, roleIds: ['r1'] }] })
    const { result, client } = setup()
    await act(async () => {
      await result.current.handleSubmit()
    })
    expect(result.current.open).toBe(true)
    expect(result.current.name).toBe('Draft')
    expect(result.current.error).toContain('Module was created')
    expect(result.current.draftLocked).toBe(true)
    expect(mocks.select).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.handleSubmit()
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.assign.mock.calls.map(([payload]) => payload.role_id)).toEqual(
      ['r1', 'r2', 'r2'],
    )
    expect(result.current.open).toBe(false)
    expect(result.current.name).toBe('')
    expect(mocks.select).toHaveBeenCalledWith('7')
    client.clear()
  })

  it('reconciles a lost assignment response without inserting that role twice', async () => {
    mocks.assign
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TypeError('Lost response'))
    mocks.read.mockResolvedValue({ data: [{ id: 7, roleIds: ['r1', 'r2'] }] })
    const { result, client } = setup()
    await act(async () => {
      await result.current.handleSubmit()
      await result.current.handleSubmit()
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.assign).toHaveBeenCalledTimes(2)
    expect(result.current.open).toBe(false)
    client.clear()
  })

  it('blocks cross-project retry and preserves partial state through close/reopen', async () => {
    mocks.assign.mockRejectedValueOnce(new Error('Denied'))
    const { result, client } = setup()
    await act(async () => {
      await result.current.handleSubmit()
    })
    act(() => {
      result.current.setOpen(false)
      useDashboardProject.setState({ selectedProjectId: 'other' })
    })
    act(() => result.current.setOpen(true))
    expect(result.current.submitBlocked).toBe(true)
    await act(async () => {
      await result.current.handleSubmit()
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.assign).toHaveBeenCalledTimes(1)
    expect(result.current.error).toContain('original project')
    client.clear()
  })

  it('does not guess or retry if creation response is ambiguous', async () => {
    mocks.create.mockRejectedValueOnce(new TypeError('Lost response'))
    const { result, client } = setup()
    await act(async () => {
      await result.current.handleSubmit()
    })
    expect(result.current.error).toContain('Creation could not be confirmed')
    expect(result.current.submitBlocked).toBe(true)
    await act(async () => {
      await result.current.handleSubmit()
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.assign).not.toHaveBeenCalled()
    client.clear()
  })

  it('does not repeat an uncertain role write when reconciliation cannot see the layout', async () => {
    mocks.assign.mockRejectedValueOnce(new Error('Lost response'))
    mocks.read.mockResolvedValue({ data: [] })
    const { result, client } = setup()
    await act(async () => {
      await result.current.handleSubmit()
      await result.current.handleSubmit()
    })
    expect(result.current.error).toContain('Unable to confirm')
    expect(mocks.assign).toHaveBeenCalledTimes(1)
    expect(result.current.open).toBe(true)
    client.clear()
  })
})
