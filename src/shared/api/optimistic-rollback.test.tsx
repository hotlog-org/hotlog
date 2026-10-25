import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  envClient: { NEXT_PUBLIC_CLIENT_API_URL: 'https://hotlog.invalid/api' },
}))
import { useDeleteApiKeyMutation } from './project-api-key/project-api-key.hook'
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useAddRolePermissionMutation,
  useRemoveRolePermissionMutation,
} from './project-role/project-role.hook'
import { useDeleteEventsMutation } from './event/event.hook'
import {
  EEventKey,
  EProjectApiKeyKey,
  EProjectPermissionKey,
  EProjectRoleKey,
} from './interface'

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}
function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const denied = () =>
  Response.json({ error: { message: 'Denied' } }, { status: 403 })
const role = (id: string) => ({ id, name: id, createdAt: '', permissions: [] })
const key = (id: number) => ({
  id,
  key_prefix: '12345678',
  last_used_at: null,
  revoked_at: null,
  project_id: 'p',
})

describe('HTTP failures reach optimistic rollback', () => {
  it.each([true, false])(
    'rolls back key deletion with populated cache=%s and isolates projects',
    async (populated) => {
      const { client, wrapper } = setup()
      const cacheKey = [EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'p']
      const previous = { data: [key(1), key(2)] }
      if (populated) client.setQueryData(cacheKey, previous)
      client.setQueryData(
        [EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'other'],
        previous,
      )
      const invalidate = vi.spyOn(client, 'invalidateQueries')
      vi.mocked(fetch).mockResolvedValueOnce(denied())
      const { result } = renderHook(() => useDeleteApiKeyMutation('p'), {
        wrapper,
      })
      await act(async () => {
        await expect(result.current.mutateAsync(1)).rejects.toThrow('Denied')
      })
      expect(client.getQueryData(cacheKey)).toEqual(
        populated ? previous : undefined,
      )
      expect(
        client.getQueryData([
          EProjectApiKeyKey.PROJECT_API_KEYS_QUERY,
          'other',
        ]),
      ).toEqual(previous)
      expect(invalidate).toHaveBeenCalledWith({ queryKey: cacheKey })
      client.clear()
    },
  )

  it.each([true, false])(
    'rolls back role create/delete/permissions with populated cache=%s',
    async (populated) => {
      const { client, wrapper } = setup()
      const cacheKey = [EProjectRoleKey.PROJECT_ROLES_QUERY, 'p']
      const permission = { id: 'permission', action: 'read', subject: 'events' }
      const previous = { data: [{ ...role('r'), permissions: [permission] }] }
      client.setQueryData([EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY], {
        data: [permission],
      })
      client.setQueryData(
        [EProjectRoleKey.PROJECT_ROLES_QUERY, 'other'],
        previous,
      )
      const { result } = renderHook(
        () => ({
          create: useCreateRoleMutation('p'),
          remove: useDeleteRoleMutation('p'),
          add: useAddRolePermissionMutation('p'),
          revoke: useRemoveRolePermissionMutation('p'),
        }),
        { wrapper },
      )
      for (const mutate of [
        () =>
          result.current.create.mutateAsync({
            project_id: 'p',
            name: 'new',
            permission_ids: [],
          }),
        () => result.current.remove.mutateAsync('r'),
        () =>
          result.current.add.mutateAsync({
            role_id: 'r',
            permission_id: 'permission',
          }),
        () =>
          result.current.revoke.mutateAsync({
            role_id: 'r',
            permission_id: 'permission',
          }),
      ]) {
        if (populated) client.setQueryData(cacheKey, previous)
        vi.mocked(fetch).mockResolvedValueOnce(denied())
        await act(async () => {
          await expect(mutate()).rejects.toThrow('Denied')
        })
        expect(client.getQueryData(cacheKey)).toEqual(
          populated ? previous : undefined,
        )
        expect(
          client.getQueryData([EProjectRoleKey.PROJECT_ROLES_QUERY, 'other']),
        ).toEqual(previous)
      }
      client.clear()
    },
  )

  it.each(['key', 'role'] as const)(
    'preserves overlapping %s deletion when earlier request fails',
    async (kind) => {
      const { client, wrapper } = setup()
      const cacheKey = [
        kind === 'key'
          ? EProjectApiKeyKey.PROJECT_API_KEYS_QUERY
          : EProjectRoleKey.PROJECT_ROLES_QUERY,
        'p',
      ]
      client.setQueryData(cacheKey, {
        data: kind === 'key' ? [key(1), key(2)] : [role('1'), role('2')],
      })
      const first = deferred(),
        second = deferred()
      vi.mocked(fetch)
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
      const { result } = renderHook(
        () => ({
          keys: useDeleteApiKeyMutation('p'),
          roles: useDeleteRoleMutation('p'),
        }),
        { wrapper },
      )
      const mutate = (id: number) =>
        kind === 'key'
          ? result.current.keys.mutateAsync(id)
          : result.current.roles.mutateAsync(String(id))
      let a!: Promise<unknown>, b!: Promise<unknown>
      act(() => {
        a = mutate(1).catch((error: unknown) => error)
      })
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
      act(() => {
        b = mutate(2)
      })
      await waitFor(() =>
        expect(client.getQueryData(cacheKey)).toEqual({ data: [] }),
      )
      await act(async () => {
        first.resolve(denied())
        await a
      })
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
      await act(async () => {
        second.resolve(new Response(null, { status: 204 }))
        await b
      })
      expect(client.getQueryData(cacheKey)).toEqual({
        data: [kind === 'key' ? key(1) : role('1')],
      })
      client.clear()
    },
  )

  it.each(['create', 'add', 'revoke'] as const)(
    'does not discard another optimistic role %s on failure',
    async (kind) => {
      const { client, wrapper } = setup()
      const cacheKey = [EProjectRoleKey.PROJECT_ROLES_QUERY, 'p']
      const permissions = ['a', 'b'].map((id) => ({
        id,
        action: 'read',
        subject: id,
      }))
      client.setQueryData(cacheKey, {
        data: [
          { ...role('r'), permissions: kind === 'revoke' ? permissions : [] },
        ],
      })
      client.setQueryData([EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY], {
        data: permissions,
      })
      const first = deferred(),
        second = deferred()
      vi.mocked(fetch)
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
      const { result } = renderHook(
        () => ({
          create: useCreateRoleMutation('p'),
          add: useAddRolePermissionMutation('p'),
          revoke: useRemoveRolePermissionMutation('p'),
        }),
        { wrapper },
      )
      const mutate = (id: string) =>
        kind === 'create'
          ? result.current.create.mutateAsync({
              project_id: 'p',
              name: id,
              permission_ids: [],
            })
          : result.current[kind].mutateAsync({
              role_id: 'r',
              permission_id: id,
            })
      let a!: Promise<unknown>, b!: Promise<unknown>
      act(() => {
        a = mutate('a').catch((error: unknown) => error)
      })
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
      act(() => {
        b = mutate('b')
      })
      await waitFor(() => expect(client.isMutating()).toBe(2))
      // Flush the second async onMutate, which runs before its scoped HTTP request.
      await act(async () => {
        await Promise.resolve()
      })
      await act(async () => {
        first.resolve(denied())
        await a
      })
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
      await act(async () => {
        second.resolve(
          kind === 'create'
            ? Response.json({ data: role('b') })
            : new Response(null, { status: 204 }),
        )
        await b
      })
      const cached = client.getQueryData<{
        data: Array<{ name: string; permissions: Array<{ id: string }> }>
      }>(cacheKey)!
      if (kind === 'create')
        expect(cached.data.map((item) => item.name)).toEqual(['r', 'b'])
      else
        expect(cached.data[0].permissions.map((item) => item.id)).toEqual(
          kind === 'add' ? ['b'] : ['a'],
        )
      client.clear()
    },
  )

  it('does not resurrect a successful overlapping event deletion', async () => {
    const { client, wrapper } = setup()
    const cacheKey = [EEventKey.EVENTS_QUERY, 'p', { search: '' }]
    const event = (id: number) => ({
      id,
      value: {},
      createdAt: '',
      schemaId: 's',
      schemaKey: 's',
      schemaDisplayName: 'S',
    })
    const data = {
      pages: [{ data: [event(1), event(2)], nextCursor: null }],
      pageParams: [null],
    }
    client.setQueryData(cacheKey, data)
    const first = deferred(),
      second = deferred()
    vi.mocked(fetch)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useDeleteEventsMutation('p'), {
      wrapper,
    })
    let a!: Promise<unknown>, b!: Promise<unknown>
    act(() => {
      a = result.current
        .mutateAsync({ projectId: 'p', ids: [1] })
        .catch((error: unknown) => error)
    })
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    act(() => {
      b = result.current.mutateAsync({ projectId: 'p', ids: [2] })
    })
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    await act(async () => {
      second.resolve(Response.json({ data: { deleted: 1 } }))
      await b
    })
    await act(async () => {
      first.resolve(denied())
      await a
    })
    expect(client.getQueryData(cacheKey)).toEqual({
      ...data,
      pages: [{ ...data.pages[0], data: [event(1)] }],
    })
    client.clear()
  })

  it('restores event filters/pageParams without touching another project', async () => {
    const { client, wrapper } = setup()
    const event = (id: number) => ({
      id,
      value: {},
      createdAt: '',
      schemaId: 's',
      schemaKey: 's',
      schemaDisplayName: 'S',
    })
    const data = {
      pages: [{ data: [event(1), event(2)], nextCursor: 'next' }],
      pageParams: [null],
    }
    const keys = [
      [EEventKey.EVENTS_QUERY, 'p', { search: '' }],
      [EEventKey.EVENTS_QUERY, 'p', { search: 'x' }],
    ]
    for (const cacheKey of keys) client.setQueryData(cacheKey, data)
    client.setQueryData([EEventKey.EVENTS_QUERY, 'other'], data)
    const response = deferred()
    vi.mocked(fetch).mockReturnValueOnce(response.promise)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteEventsMutation('p'), {
      wrapper,
    })
    let operation!: Promise<unknown>
    act(() => {
      operation = result.current
        .mutateAsync({ projectId: 'p', ids: [1] })
        .catch((error: unknown) => error)
    })
    await waitFor(() =>
      expect(client.getQueryData(keys[0])).toEqual({
        ...data,
        pages: [{ ...data.pages[0], data: [event(2)] }],
      }),
    )
    await act(async () => {
      response.resolve(denied())
      await operation
    })
    for (const cacheKey of keys)
      expect(client.getQueryData(cacheKey)).toEqual(data)
    expect(client.getQueryData([EEventKey.EVENTS_QUERY, 'other'])).toEqual(data)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [EEventKey.EVENT_STATS_QUERY, 'p'],
    })
    client.clear()
  })
})
