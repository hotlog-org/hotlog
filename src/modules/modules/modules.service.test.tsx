import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ILayoutListResponse } from '@/shared/api/interface'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  batch: vi.fn(),
  mutate: vi.fn(),
  setSelected: vi.fn(),
  layouts: {
    data: undefined as ILayoutListResponse | undefined,
    isLoading: false,
  },
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/shared/api/layout', () => ({
  useLayoutsQuery: () => mocks.layouts,
  useUpdateLayoutMutation: () => ({
    mutateAsync: mocks.update,
    isPending: false,
  }),
  useBatchComponentsMutation: () => ({
    mutateAsync: mocks.batch,
    isPending: false,
  }),
  useAddRoleLayoutMutation: () => ({ mutate: mocks.mutate }),
  useRemoveRoleLayoutMutation: () => ({ mutate: mocks.mutate }),
}))
vi.mock('@/shared/api/schema', () => ({
  useSchemasQuery: () => ({ data: undefined }),
}))
vi.mock('@/shared/api/project-role/project-role.hook', () => ({
  useProjectRolesQuery: () => ({ data: undefined }),
}))
vi.mock('@/shared/api/user-permission/user-permission.hook', () => ({
  useUserPermissions: () => ({ can: () => true }),
}))
vi.mock('./modules.store', () => ({
  useModulesStore: () => ({
    selectedModuleId: '1',
    setSelectedModuleId: mocks.setSelected,
  }),
}))
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useModulesService } from './modules.service'

beforeEach(() => {
  useDashboardProject.setState({ selectedProjectId: 'p' })
  mocks.layouts.data = {
    currentUserRoleIds: [],
    data: [
      {
        id: 1,
        name: 'Original',
        description: '',
        color: '#000000',
        roleIds: [],
        createdAt: '',
        components: [
          {
            id: 'c',
            visualization: 'line',
            schemaId: 's',
            bindings: [],
            title: 'Chart',
            description: '',
            index: 0,
            span: 'full',
          },
        ],
      },
    ],
  }
})

describe('module save failure drafts', () => {
  it('retains edits/error after metadata success/refetch and component failure; retries without resetting', async () => {
    let fail!: (error: Error) => void
    mocks.update.mockImplementation(async () => {
      mocks.layouts.data = {
        ...mocks.layouts.data!,
        data: [{ ...mocks.layouts.data!.data[0], name: 'Edited' }],
      }
      return { data: mocks.layouts.data.data[0] }
    })
    mocks.batch.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject
        }),
    )
    const { result, rerender } = renderHook(() =>
      useModulesService({ moduleId: '1' }),
    )
    act(() => {
      result.current.updateName('Edited')
      result.current.toggleComponentSpan('c')
    })
    let saving!: void
    // Service exposes a void handler for buttons, but returns a handled promise.
    act(() => {
      saving = result.current.saveModule()
    })
    await waitFor(() => expect(mocks.batch).toHaveBeenCalledTimes(1))
    rerender()
    expect(result.current.module?.components[0].span).toBe('half')
    expect(result.current.isDirty).toBe(true)
    await act(async () => {
      fail(new Error('Components denied'))
      await saving
    })
    expect(result.current.saveError).toBe('Components denied')
    expect(result.current.module?.name).toBe('Edited')
    expect(result.current.module?.components[0].span).toBe('half')
    expect(result.current.isDirty).toBe(true)
    mocks.batch.mockResolvedValueOnce({ data: [] })
    await act(async () => {
      await result.current.saveModule()
    })
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(result.current.isDirty).toBe(false)
    expect(result.current.saveError).toBeNull()
  })

  it('retains a draft on the first failure and resets it only on explicit cancel', async () => {
    mocks.update.mockRejectedValueOnce(new Error('Metadata denied'))
    const { result } = renderHook(() => useModulesService({ moduleId: '1' }))
    act(() => result.current.updateName('Unsaved'))
    await act(async () => {
      await result.current.saveModule()
    })
    expect(result.current.module?.name).toBe('Unsaved')
    expect(result.current.saveError).toBe('Metadata denied')
    expect(mocks.batch).not.toHaveBeenCalled()
    act(() => result.current.cancelChanges())
    expect(result.current.module?.name).toBe('Original')
    expect(result.current.isDirty).toBe(false)
  })

  it('does not carry a failed draft into another project', async () => {
    mocks.update.mockRejectedValueOnce(new Error('Denied'))
    const { result } = renderHook(() => useModulesService({ moduleId: '1' }))
    act(() => result.current.updateName('Unsaved'))
    await act(async () => {
      await result.current.saveModule()
    })
    act(() => useDashboardProject.setState({ selectedProjectId: 'other' }))
    expect(result.current.module?.name).toBe('Original')
    expect(result.current.saveError).toBeNull()
  })
})
