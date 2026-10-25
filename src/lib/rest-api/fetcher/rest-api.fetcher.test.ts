// @vitest-environment node
import { QueryClient, type QueryFunctionContext } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  envClient: { NEXT_PUBLIC_CLIENT_API_URL: 'https://hotlog.invalid/api' },
}))

import { restApiFetcher } from './rest-api.fetcher'
import { deleteEventsApi, eventsListApi } from '@/shared/api/event/event.api'
import {
  acceptInvitationApi,
  createInvitationApi,
  revokeInvitationApi,
} from '@/shared/api/invitation/invitation.api'
import {
  deleteApiKeyApi,
  projectApiKeysQueryApi,
} from '@/shared/api/project-api-key/project-api-key.api'
import {
  deleteRoleApi,
  projectRolesQueryApi,
} from '@/shared/api/project-role/project-role.api'
import {
  projectMembersQueryApi,
  removeMemberApi,
} from '@/shared/api/project-member/project-member.api'
import {
  createProjectApi,
  deleteProjectApi,
  userProjectsQueryApi,
} from '@/shared/api/user-project/user-project.api'
import {
  deleteLayoutApi,
  layoutsQueryApi,
} from '@/shared/api/layout/layout.api'
import { schemasQueryApi } from '@/shared/api/schema/schema.api'
import { projectPermissionsQueryApi } from '@/shared/api/project-permission/project-permission.api'
import { userPermissionsQueryApi } from '@/shared/api/user-permission/user-permission.api'

const opt: QueryFunctionContext = {
  client: new QueryClient(),
  queryKey: ['test'],
  signal: new AbortController().signal,
  meta: undefined,
}
const reads = [
  () => eventsListApi({ projectId: 'p' }, opt),
  () => projectApiKeysQueryApi('p', opt),
  () => projectRolesQueryApi('p', opt),
  () => projectMembersQueryApi('p', opt),
  () => userProjectsQueryApi(opt),
  () => layoutsQueryApi('p', opt),
  () => schemasQueryApi('p', false, opt),
  () => projectPermissionsQueryApi(opt),
  () => userPermissionsQueryApi('p', opt),
]
const writes = [
  () => deleteApiKeyApi(1),
  () => deleteRoleApi('r'),
  () => removeMemberApi({ project_id: 'p', user_id: 'u' }),
  () => deleteProjectApi('p'),
  () => deleteLayoutApi(1),
  () => revokeInvitationApi({ invitation_id: 'i' }),
  () => createInvitationApi({ project_id: 'p', email: 'test@example.invalid' }),
]

describe('API origin selection', () => {
  it.each([undefined, 'https://preview.hotlog.invalid'])(
    'selects the API origin for %s',
    async (origin) => {
      vi.resetModules()
      if (origin) vi.stubGlobal('window', { location: { origin } })
      const { restApiFetcher: fetcher } = await import('./rest-api.fetcher')
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({ data: [] }))
      await fetcher.get('test')
      const request = vi.mocked(fetch).mock.calls[0][0] as Request
      expect(request.url).toBe(`${origin ?? 'https://hotlog.invalid'}/api/test`)
    },
  )
})

describe('shared HTTP failure contract', () => {
  it.each([400, 401, 403, 404, 409, 413, 429, 500, 503])(
    'preserves JSON message/status %i without HTTP retries',
    async (status) => {
      vi.mocked(fetch).mockImplementation(async () =>
        Response.json(
          { error: { message: 'Useful server message' } },
          { status, headers: { 'Retry-After': '0' } },
        ),
      )
      await expect(restApiFetcher.delete('test')).rejects.toMatchObject({
        message: 'Useful server message',
        response: { status },
      })
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    '',
    '<html>failure</html>',
    '{bad',
    '{"error":null}',
    '{"error":{"message":42}}',
    '{"error":{"message":""}}',
  ])('falls back safely for %s', async (body) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(body, { status: 500 }))
    await expect(restApiFetcher.get('test')).rejects.toMatchObject({
      message: 'Request failed with status 500',
      response: { status: 500 },
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each(reads)(
    'rejects a failed read rather than caching error JSON (%#)',
    async (read) => {
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ error: { message: 'Denied' } }, { status: 403 }),
      )
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      await expect(
        client.fetchQuery<unknown>({ queryKey: ['read'], queryFn: read }),
      ).rejects.toThrow('Denied')
      expect(client.getQueryData(['read'])).toBeUndefined()
      client.clear()
    },
  )

  it.each(writes)('rejects void mutation HTTP failures (%#)', async (write) => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ error: { message: 'Denied' } }, { status: 403 }),
    )
    await expect(write()).rejects.toBeInstanceOf(HTTPError)
  })

  it.each(writes)('accepts 204 void mutations (%#)', async (write) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(write()).resolves.toBeUndefined()
  })

  it('preserves 201, 207 and invitation/event messages', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: [] }, { status: 201 }),
    )
    await expect(createProjectApi('Test')).resolves.toEqual({ data: [] })
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: { deleted: 1 } }, { status: 207 }),
    )
    await expect(
      deleteEventsApi({ projectId: 'p', ids: [1, 2] }),
    ).resolves.toEqual({ data: { deleted: 1 } })
    for (const call of [
      () => deleteEventsApi({ projectId: 'p', ids: [1] }),
      () => acceptInvitationApi({ token: 'synthetic' }),
    ]) {
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json(
          { error: { message: 'Specific reason' } },
          { status: 400 },
        ),
      )
      await expect(call()).rejects.toThrow('Specific reason')
    }
  })

  it('retains network retry defaults and the original error', async () => {
    const error = new TypeError('Network unavailable')
    vi.mocked(fetch).mockRejectedValue(error)
    await expect(
      restApiFetcher.delete('test', { retry: { delay: () => 0 } }),
    ).rejects.toBe(error)
    expect(fetch).toHaveBeenCalledTimes(3)
    vi.mocked(fetch).mockClear()
    await expect(restApiFetcher.post('test')).rejects.toBe(error)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('preserves abort reason and does not retry a cancelled request', async () => {
    const controller = new AbortController()
    const error = new DOMException('Cancelled', 'AbortError')
    vi.mocked(fetch).mockImplementation(async (request) => {
      expect((request as Request).credentials).toBe('include')
      controller.abort(error)
      throw error
    })
    await expect(
      restApiFetcher.get('test', { signal: controller.signal }),
    ).rejects.toBe(error)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
