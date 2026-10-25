import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ELayoutKey,
  type ILayoutDto,
  type ILayoutListResponse,
} from '@/shared/api/interface'

const api = vi.hoisted(() => ({
  read: vi.fn(),
  update: vi.fn(),
  batch: vi.fn(),
  addRole: vi.fn(),
  removeRole: vi.fn(),
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/shared/api/layout/layout.api', () => ({
  layoutsQueryApi: api.read,
  updateLayoutApi: api.update,
  batchComponentsApi: api.batch,
  createLayoutApi: vi.fn(),
  deleteLayoutApi: vi.fn(),
  addRoleLayoutApi: api.addRole,
  removeRoleLayoutApi: api.removeRole,
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
import { useModulesService } from './modules.service'
import { useModulesStore } from './modules.store'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const original: ILayoutDto = {
  id: 1,
  name: 'A',
  color: '#000000',
  description: '',
  roleIds: [],
  createdAt: '',
  components: [],
}
const cacheKey = [ELayoutKey.LAYOUTS_QUERY, 'p']
function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  client.setQueryData(cacheKey, { data: [original], currentUserRoleIds: [] })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(({ moduleId }) => useModulesService({ moduleId }), {
    wrapper,
    initialProps: { moduleId: '1' },
  })
  return { client, ...hook }
}
beforeEach(() => {
  useDashboardProject.setState({ selectedProjectId: 'p' })
  useModulesStore.setState({ selectedModuleId: '1' })
  api.read.mockReset()
  api.update.mockReset()
  api.batch.mockReset()
  api.update.mockImplementation(async (payload) => ({
    data: { ...original, ...payload },
  }))
})

describe('module successful-save reconciliation with real layout hooks', () => {
  it.each(['delayed', 'failed'] as const)(
    'keeps submitted B across %s refetch and never sends cached A on the next color save',
    async (mode) => {
      const refetch = deferred<ILayoutListResponse>()
      api.read
        .mockReturnValue(new Promise(() => {}))
        .mockReturnValueOnce(refetch.promise)
      const { client, result } = setup()
      act(() => result.current.updateName('B'))
      await act(async () => {
        await result.current.saveModule()
      })
      await waitFor(() => expect(api.read).toHaveBeenCalledTimes(1))
      if (mode === 'failed') {
        await act(async () => {
          refetch.reject(new Error('Refetch failed'))
        })
        await waitFor(() =>
          expect(client.getQueryState(cacheKey)?.status).toBe('error'),
        )
      }
      expect(result.current.module?.name).toBe('B')
      expect(result.current.isDirty).toBe(false)
      expect(result.current.saveError).toBeNull()
      act(() => result.current.updateColor('#112233'))
      await act(async () => {
        await result.current.saveModule()
      })
      expect(api.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 1, name: 'B', color: '#112233' }),
      )
      expect(result.current.module?.name).toBe('B')
      expect(result.current.module?.color).toBe('#112233')
      if (mode === 'delayed') {
        // This pre-color-save GET is stale and must have been cancelled before
        // publishing the newer write response, even if its transport ignores abort.
        await act(async () => {
          refetch.resolve({
            data: [{ ...original, name: 'B' }],
            currentUserRoleIds: [],
          })
        })
        expect(result.current.module?.color).toBe('#112233')
      }
      client.clear()
    },
  )

  it.each(['delayed', 'failed'] as const)(
    'adopts server-generated component IDs before a second save with %s refetch',
    async (mode) => {
      const refetch = deferred<ILayoutListResponse>()
      api.read
        .mockReturnValue(new Promise(() => {}))
        .mockReturnValueOnce(refetch.promise)
      const component = {
        id: 'server-component',
        visualization: 'line',
        schemaId: 'schema',
        bindings: [],
        title: 'New',
        description: '',
        index: 0,
        span: 'full',
      }
      api.batch.mockResolvedValue({ data: [component] })
      const { result, client } = setup()
      act(() =>
        result.current.submitComponent({
          id: 'local-component',
          kind: 'chart',
          visualization: 'line',
          schemaId: 'schema',
          bindings: [],
          title: 'New',
          span: 'full',
        }),
      )
      await act(async () => {
        await result.current.saveModule()
      })
      await waitFor(() => expect(api.read).toHaveBeenCalledTimes(1))
      if (mode === 'failed') {
        await act(async () => {
          refetch.reject(new Error('Refetch failed'))
        })
        await waitFor(() =>
          expect(client.getQueryState(cacheKey)?.status).toBe('error'),
        )
      }
      expect(result.current.module?.components.map((item) => item.id)).toEqual([
        'server-component',
      ])
      expect(api.batch.mock.calls[0][0].creates).toHaveLength(1)
      act(() => result.current.updateColor('#112233'))
      // Metadata PATCH must reflect the actual persisted component too.
      api.update.mockImplementation(async (payload) => ({
        data: { ...original, ...payload, components: [component] },
      }))
      await act(async () => {
        await result.current.saveModule()
      })
      expect(api.batch.mock.calls[1][0]).toMatchObject({
        creates: [],
        updates: [{ id: 'server-component' }],
        deletes: [],
      })
      expect(result.current.module?.components[0].id).toBe('server-component')
      expect(result.current.isDirty).toBe(false)
      client.clear()
    },
  )

  it('cancels to confirmed saved B, not cached A, when refetch is still pending', async () => {
    api.read.mockReturnValue(new Promise(() => {}))
    const { result, client } = setup()
    act(() => result.current.updateName('B'))
    await act(async () => {
      await result.current.saveModule()
    })
    act(() => result.current.updateName('Unsaved C'))
    act(() => result.current.cancelChanges())
    expect(result.current.module?.name).toBe('B')
    expect(result.current.isDirty).toBe(false)
    client.clear()
  })

  it('does not apply a late A save or cache publication to selected project B', async () => {
    const response = deferred<{ data: ILayoutDto }>()
    api.update.mockReturnValue(response.promise)
    api.read.mockReturnValue(new Promise(() => {}))
    const { result, client } = setup()
    const other = { ...original, name: 'Other project' }
    const otherKey = [ELayoutKey.LAYOUTS_QUERY, 'other']
    client.setQueryData(otherKey, { data: [other], currentUserRoleIds: [] })
    act(() => {
      result.current.updateName('Saved in p')
      result.current.submitComponent({
        id: 'local-component',
        kind: 'chart',
        visualization: 'line',
        schemaId: 'schema',
        bindings: [],
        title: 'New',
        span: 'full',
      })
    })
    api.batch.mockResolvedValue({
      data: [
        {
          id: 'server-component',
          visualization: 'line',
          schemaId: 'schema',
          bindings: [],
          title: 'New',
          description: '',
          index: 0,
          span: 'full',
        },
      ],
    })
    let save!: void
    act(() => {
      save = result.current.saveModule()
    })
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
    act(() => useDashboardProject.setState({ selectedProjectId: 'other' }))
    act(() => result.current.updateName('Other unsaved'))
    await act(async () => {
      response.resolve({ data: { ...original, name: 'Saved in p' } })
      await save
    })
    expect(result.current.module?.name).toBe('Other unsaved')
    expect(result.current.isDirty).toBe(true)
    expect(client.getQueryData(otherKey)).toEqual({
      data: [other],
      currentUserRoleIds: [],
    })
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false)
    expect(client.getQueryData(cacheKey)).toMatchObject({
      data: [{ name: 'Saved in p' }],
    })
    client.clear()
  })
  it.each(['success', 'failure'] as const)(
    'isolates a late %s after switching module and back',
    async (outcome) => {
      const response = deferred<{ data: ILayoutDto }>()
      api.update.mockReturnValue(response.promise)
      api.read.mockReturnValue(new Promise(() => {}))
      const { result, client, rerender } = setup()
      client.setQueryData(cacheKey, {
        data: [original, { ...original, id: 2, name: 'Second' }],
        currentUserRoleIds: [],
      })
      act(() => result.current.updateName('Submitted B'))
      let save!: void
      act(() => {
        save = result.current.saveModule()
      })
      await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
      rerender({ moduleId: '2' })
      expect(result.current.module?.name).toBe('Second')
      rerender({ moduleId: '1' })
      act(() => result.current.updateName('Newer unsaved draft'))
      await act(async () => {
        if (outcome === 'success')
          response.resolve({ data: { ...original, name: 'Submitted B' } })
        else response.reject(new Error('Old save failed'))
        await save
      })
      expect(result.current.module?.name).toBe('Newer unsaved draft')
      expect(result.current.isDirty).toBe(true)
      expect(result.current.saveError).toBeNull()
      client.clear()
    },
  )
  it('reconciles a later authoritative GET after preserving the successful write', async () => {
    const refetch = deferred<ILayoutListResponse>()
    api.read.mockReturnValue(refetch.promise)
    const { result, client } = setup()
    act(() => result.current.updateName('B'))
    await act(async () => {
      await result.current.saveModule()
    })
    expect(result.current.module?.name).toBe('B')
    await act(async () => {
      refetch.resolve({
        data: [{ ...original, name: 'B from server', roleIds: ['role'] }],
        currentUserRoleIds: [],
      })
    })
    await waitFor(() =>
      expect(result.current.module?.name).toBe('B from server'),
    )
    expect(result.current.module?.roleIds).toEqual(['role'])
    expect(result.current.isDirty).toBe(false)
    client.clear()
  })

  it('retains a dirty component draft after metadata succeeds and component save/refetch fail', async () => {
    api.read.mockRejectedValue(new Error('Refetch failed'))
    api.batch.mockRejectedValueOnce(new Error('Component save denied'))
    const { result, client } = setup()
    act(() => {
      result.current.updateName('B')
      result.current.submitComponent({
        id: 'local-component',
        kind: 'chart',
        visualization: 'line',
        schemaId: 'schema',
        bindings: [],
        title: 'New',
        span: 'full',
      })
    })
    await act(async () => {
      await result.current.saveModule()
    })
    expect(result.current.module?.name).toBe('B')
    expect(result.current.module?.components[0].id).toBe('local-component')
    expect(result.current.isDirty).toBe(true)
    expect(result.current.saveError).toBe('Component save denied')
    api.batch.mockResolvedValueOnce({
      data: [
        {
          id: 'server-component',
          visualization: 'line',
          schemaId: 'schema',
          bindings: [],
          title: 'New',
          description: '',
          index: 0,
          span: 'full',
        },
      ],
    })
    await act(async () => {
      await result.current.saveModule()
    })
    expect(api.update).toHaveBeenCalledTimes(1)
    expect(result.current.module?.components[0].id).toBe('server-component')
    expect(result.current.isDirty).toBe(false)
    expect(result.current.saveError).toBeNull()
    client.clear()
  })
  it.each(['success', 'failure'] as const)(
    'blocks same-identity edits synchronously during pending B save (%s), then allows C with persisted IDs',
    async (outcome) => {
      const response = deferred<{ data: ILayoutDto }>()
      api.update.mockReturnValueOnce(response.promise)
      api.read.mockReturnValue(new Promise(() => {}))
      const component = {
        id: 'server-component',
        visualization: 'line',
        schemaId: 'schema',
        bindings: [],
        title: 'New',
        description: '',
        index: 0,
        span: 'full',
      }
      api.batch.mockResolvedValue({ data: [component] })
      const { result, client } = setup()
      act(() => {
        result.current.updateName('B')
        result.current.submitComponent({
          id: 'local-component',
          kind: 'chart',
          visualization: 'line',
          schemaId: 'schema',
          bindings: [],
          title: 'New',
          span: 'full',
        })
      })
      let save!: void
      act(() => {
        save = result.current.saveModule()
        // No rerender yet: event entry points must already reject edits.
        result.current.updateName('C')
      })
      expect(result.current.module?.name).toBe('B')
      act(() => {
        result.current.updateColor('#112233')
        result.current.updateHeroDescription('Later description')
        result.current.toggleComponentSpan('local-component')
        result.current.deleteComponent('local-component')
        result.current.reorderComponent('local-component', 'missing')
        result.current.submitComponent({
          id: 'unexpected',
          kind: 'chart',
          visualization: 'line',
          schemaId: 'schema',
          bindings: [],
          title: 'Unexpected',
          span: 'full',
        })
        result.current.cancelChanges()
        result.current.openEditComponent('local-component')
        result.current.openCreateComponent()
        result.current.setEditingField('name')
        result.current.setReorderEnabled(true)
        result.current.addLayoutRole('role')
        result.current.removeLayoutRole('role')
      })
      await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
      expect(result.current.module?.name).toBe('B')
      expect(result.current.module?.color).toBe('#000000')
      expect(result.current.module?.heroDescription).toBe('')
      expect(
        result.current.module?.components.map((item) => [item.id, item.span]),
      ).toEqual([['local-component', 'full']])
      expect(result.current.editor.open).toBe(false)
      expect(result.current.editingField).toBeNull()
      expect(result.current.reorderEnabled).toBe(false)
      expect(api.addRole).not.toHaveBeenCalled()
      expect(api.removeRole).not.toHaveBeenCalled()
      await act(async () => {
        if (outcome === 'success')
          response.resolve({ data: { ...original, name: 'B' } })
        else response.reject(new Error('Save denied'))
        await save
      })
      expect(result.current.isSaving).toBe(false)
      expect(result.current.module?.name).toBe('B')
      expect(result.current.isDirty).toBe(outcome === 'failure')
      if (outcome === 'failure') {
        await act(async () => {
          await result.current.saveModule()
        })
      }
      expect(result.current.module?.components[0].id).toBe('server-component')
      act(() => result.current.updateName('C'))
      expect(result.current.module?.name).toBe('C')
      api.update.mockImplementation(async (payload) => ({
        data: { ...original, ...payload, components: [component] },
      }))
      await act(async () => {
        await result.current.saveModule()
      })
      expect(api.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'C' }),
      )
      expect(api.batch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          creates: [],
          updates: [expect.objectContaining({ id: 'server-component' })],
        }),
      )
      expect(result.current.module?.name).toBe('C')
      expect(result.current.isDirty).toBe(false)
      client.clear()
    },
  )

  it('does not start a save over an unsubmitted component editor, including the same event tick', async () => {
    api.read.mockReturnValue(new Promise(() => {}))
    const { result, client } = setup()
    act(() => result.current.updateName('B'))
    await act(async () => {
      result.current.openCreateComponent()
      await result.current.saveModule()
    })
    expect(api.update).not.toHaveBeenCalled()
    expect(result.current.editor.open).toBe(true)
    expect(result.current.isDirty).toBe(true)
    act(() => result.current.closeEditor())
    await act(async () => {
      await result.current.saveModule()
    })
    expect(api.update).toHaveBeenCalledTimes(1)
    expect(result.current.module?.name).toBe('B')
    client.clear()
  })
})
