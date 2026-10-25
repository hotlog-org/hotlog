import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  envClient: { NEXT_PUBLIC_CLIENT_API_URL: 'https://hotlog.invalid/api' },
}))
import {
  useAddRolePermissionMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useRemoveRolePermissionMutation,
} from './project-role/project-role.hook'
import {
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useRotateApiKeyMutation,
} from './project-api-key/project-api-key.hook'
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
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const permission = { id: 'permission', action: 'read', subject: 'events' }
const role = (id: string) => ({
  id,
  name: id,
  createdAt: '',
  permissions: [permission],
})
const key = (id: number, project_id: string) => ({
  id,
  project_id,
  key_prefix: '12345678',
  last_used_at: null,
  revoked_at: null,
})
const denied = () =>
  Response.json({ error: { message: 'Denied' } }, { status: 403 })

const roleCases = ['create', 'delete', 'add', 'remove'] as const
for (const outcome of ['success', 'failure'] as const) {
  describe(`pending project switch: ${outcome}`, () => {
    it.each(roleCases)(
      'keeps role %s rollback and settlement bound to A',
      async (kind) => {
        const { client, wrapper } = setup()
        const aKey = [EProjectRoleKey.PROJECT_ROLES_QUERY, 'A']
        const bKey = [EProjectRoleKey.PROJECT_ROLES_QUERY, 'B']
        const a = {
          data: [
            { ...role('a'), permissions: kind === 'add' ? [] : [permission] },
          ],
        }
        const b = { data: [role('b')] }
        client.setQueryData(aKey, a)
        client.setQueryData(bKey, b)
        client.setQueryData([EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY], {
          data: [permission],
        })
        const invalidate = vi.spyOn(client, 'invalidateQueries')
        // Also switch while the originating onMutate is awaiting cancellation.
        const cancel = deferred<void>()
        vi.spyOn(client, 'cancelQueries').mockReturnValueOnce(cancel.promise)
        const response = deferred<Response>()
        vi.mocked(fetch).mockReturnValueOnce(response.promise)
        const { result, rerender } = renderHook(
          ({ project }) => ({
            create: useCreateRoleMutation(project),
            delete: useDeleteRoleMutation(project),
            add: useAddRolePermissionMutation(project),
            remove: useRemoveRolePermissionMutation(project),
          }),
          { wrapper, initialProps: { project: 'A' } },
        )
        let operation!: Promise<unknown>
        act(() => {
          const pending =
            kind === 'create'
              ? result.current.create.mutateAsync({
                  project_id: 'A',
                  name: 'New',
                  permission_ids: [],
                })
              : kind === 'delete'
                ? result.current.delete.mutateAsync('a')
                : result.current[kind].mutateAsync({
                    role_id: 'a',
                    permission_id: 'permission',
                  })
          operation = pending.catch((error: unknown) => error)
        })
        await waitFor(() => expect(client.cancelQueries).toHaveBeenCalled())
        rerender({ project: 'B' })
        await act(async () => {
          cancel.resolve()
        })
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
        expect(client.getQueryData(bKey)).toEqual(b)
        await act(async () => {
          response.resolve(
            outcome === 'failure'
              ? denied()
              : kind === 'create'
                ? Response.json({ data: role('new') })
                : new Response(null, { status: 204 }),
          )
          await operation
        })
        if (outcome === 'failure') expect(client.getQueryData(aKey)).toEqual(a)
        expect(client.getQueryData(bKey)).toEqual(b)
        expect(invalidate.mock.calls).toEqual([[{ queryKey: aKey }]])
        expect(client.getQueryState(bKey)?.isInvalidated).toBe(false)
        client.clear()
      },
    )

    it.each(['create', 'rotate', 'revoke'] as const)(
      'keeps key %s settlement/rollback bound to A without cached secrets',
      async (kind) => {
        const { client, wrapper } = setup()
        const aKey = [EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'A']
        const bKey = [EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'B']
        const a = { data: [key(1, 'A')] },
          b = { data: [key(2, 'B')] }
        client.setQueryData(aKey, a)
        client.setQueryData(bKey, b)
        const invalidate = vi.spyOn(client, 'invalidateQueries')
        const response = deferred<Response>()
        vi.mocked(fetch).mockReturnValueOnce(response.promise)
        const onSecret = vi.fn()
        const { result, rerender } = renderHook(
          ({ project }) => ({
            create: useCreateApiKeyMutation(project, onSecret),
            rotate: useRotateApiKeyMutation(project, onSecret),
            revoke: useDeleteApiKeyMutation(project),
          }),
          { wrapper, initialProps: { project: 'A' } },
        )
        let operation!: Promise<unknown>
        act(() => {
          const pending =
            kind === 'revoke'
              ? result.current.revoke.mutateAsync(1)
              : kind === 'create'
                ? result.current.create.mutateAsync({ project_id: 'A' })
                : result.current.rotate.mutateAsync({ project_id: 'A', id: 1 })
          operation = pending.catch((error: unknown) => error)
        })
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
        rerender({ project: 'B' })
        await act(async () => {
          response.resolve(
            outcome === 'failure'
              ? denied()
              : kind === 'revoke'
                ? new Response(null, { status: 204 })
                : Response.json(
                    {
                      data: {
                        ...key(3, 'A'),
                        key: 'synthetic-one-time-secret',
                      },
                    },
                    { status: 201 },
                  ),
          )
          await operation
        })
        if (outcome === 'failure') expect(client.getQueryData(aKey)).toEqual(a)
        expect(client.getQueryData(bKey)).toEqual(b)
        expect(invalidate.mock.calls).toEqual([[{ queryKey: aKey }]])
        expect(client.getQueryState(bKey)?.isInvalidated).toBe(false)
        expect(onSecret).toHaveBeenCalledTimes(
          outcome === 'success' && kind !== 'revoke' ? 1 : 0,
        )
        expect(
          JSON.stringify(
            client
              .getQueryCache()
              .getAll()
              .map((query) => query.state),
          ),
        ).not.toContain('synthetic-one-time-secret')
        expect(
          JSON.stringify(
            client
              .getMutationCache()
              .getAll()
              .map((mutation) => mutation.state),
          ),
        ).not.toContain('synthetic-one-time-secret')
        client.clear()
      },
    )

    it('keeps event list and stats settlement bound to payload A', async () => {
      const { client, wrapper } = setup()
      const aKey = [EEventKey.EVENTS_QUERY, 'A', { search: '' }]
      const bKey = [EEventKey.EVENTS_QUERY, 'B', { search: '' }]
      const a = {
        pages: [{ data: [{ id: 1 }], nextCursor: null }],
        pageParams: [null],
      }
      const b = {
        pages: [{ data: [{ id: 2 }], nextCursor: null }],
        pageParams: [null],
      }
      client.setQueryData(aKey, a)
      client.setQueryData(bKey, b)
      const invalidate = vi.spyOn(client, 'invalidateQueries')
      const response = deferred<Response>()
      vi.mocked(fetch).mockReturnValueOnce(response.promise)
      const { result, rerender } = renderHook(
        ({ project }) => useDeleteEventsMutation(project),
        { wrapper, initialProps: { project: 'A' } },
      )
      let operation!: Promise<unknown>
      act(() => {
        operation = result.current
          .mutateAsync({ projectId: 'A', ids: [1] })
          .catch((error: unknown) => error)
      })
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
      rerender({ project: 'B' })
      await act(async () => {
        response.resolve(
          outcome === 'failure'
            ? denied()
            : Response.json({ data: { deleted: 1 } }),
        )
        await operation
      })
      if (outcome === 'failure') expect(client.getQueryData(aKey)).toEqual(a)
      expect(client.getQueryData(bKey)).toEqual(b)
      expect(invalidate.mock.calls).toEqual([
        [{ queryKey: [EEventKey.EVENTS_QUERY, 'A'] }],
        [{ queryKey: [EEventKey.EVENT_STATS_QUERY, 'A'] }],
      ])
      expect(client.getQueryState(bKey)?.isInvalidated).toBe(false)
      client.clear()
    })
  })
}

it('uses authoritative create/rotate payload projects rather than the mounted project', async () => {
  const { client, wrapper } = setup()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  vi.mocked(fetch).mockImplementation(async () => denied())
  const { result } = renderHook(
    () => ({
      role: useCreateRoleMutation('B'),
      create: useCreateApiKeyMutation('B', vi.fn()),
      rotate: useRotateApiKeyMutation('B', vi.fn()),
    }),
    { wrapper },
  )
  await act(async () => {
    await result.current.role
      .mutateAsync({ project_id: 'A', name: 'New', permission_ids: [] })
      .catch(() => {})
    await result.current.create.mutateAsync({ project_id: 'A' }).catch(() => {})
    await result.current.rotate
      .mutateAsync({ project_id: 'A', id: 1 })
      .catch(() => {})
  })
  expect(invalidate.mock.calls).toEqual([
    [{ queryKey: [EProjectRoleKey.PROJECT_ROLES_QUERY, 'A'] }],
    [{ queryKey: [EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'A'] }],
    [{ queryKey: [EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'A'] }],
  ])
  client.clear()
})
