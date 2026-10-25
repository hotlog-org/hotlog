// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, single, getUser, from, select, eq, order } = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser }, rpc, from }),
}))
import { DELETE, GET, PATCH, POST } from './route'
const projectId = '11111111-1111-4111-8111-111111111111'
const metadata = {
  id: 7,
  project_id: projectId,
  key_prefix: '12345678',
  last_used_at: null,
  revoked_at: null,
}
const issued = { ...metadata, key: '12345678-1234-4123-8123-123456789012' }
const request = (body?: unknown, query = '') =>
  new NextRequest(
    `https://hotlog.invalid/api/project/api-keys${query}`,
    body === undefined
      ? undefined
      : { method: 'POST', body: JSON.stringify(body) },
  )
beforeEach(() => {
  getUser.mockResolvedValue({
    data: { user: { id: 'synthetic' } },
    error: null,
  })
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({ data: issued, error: null })
  from.mockReturnValue({ select })
  select.mockReturnValue({ eq })
  eq.mockReturnValue({ order })
  order.mockResolvedValue({ data: [metadata], error: null })
})
describe('API key route', () => {
  it('lists only metadata, including audit fields, with no-store', async () => {
    const response = await GET(request(undefined, `?project_id=${projectId}`))
    expect(select).toHaveBeenCalledExactlyOnceWith(
      'id, project_id, key_prefix, last_used_at, revoked_at',
    )
    expect(await response.json()).toEqual({ data: [metadata] })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it.each([
    ['create', POST],
    ['rotate', PATCH],
  ] as const)(
    '%s uses one atomic RPC and returns a secret once',
    async (kind, handler) => {
      const response = await handler(request({ project_id: projectId, id: 3 }))
      expect(response.status).toBe(201)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toEqual({ data: issued })
      expect(rpc).toHaveBeenCalledExactlyOnceWith('create_api_key', {
        p_project_id: projectId,
        ...(kind === 'rotate' ? { p_replace_key_id: 3 } : {}),
      })
      expect(from).not.toHaveBeenCalled()
    },
  )
  it.each([
    null,
    [],
    {},
    { project_id: 'bad' },
    { project_id: projectId },
    { project_id: projectId, id: 0 },
    { project_id: projectId, id: 1.5 },
    { project_id: projectId, id: '3' },
  ])('rejects invalid rotation request %j', async (body) => {
    expect((await PATCH(request(body))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
  it('rejects malformed JSON', async () => {
    expect(
      (
        await POST(
          new NextRequest('https://hotlog.invalid/api/project/api-keys', {
            method: 'POST',
            body: '{',
          }),
        )
      ).status,
    ).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each([GET, POST, PATCH, DELETE])(
    'rejects unauthenticated callers',
    async (handler) => {
      getUser.mockResolvedValue({ data: { user: null }, error: null })
      expect(
        (
          await handler(
            request(
              { project_id: projectId, id: 3 },
              `?project_id=${projectId}&id=3`,
            ),
          )
        ).status,
      ).toBe(401)
      expect(rpc).not.toHaveBeenCalled()
      expect(from).not.toHaveBeenCalled()
    },
  )
  it.each([
    ['28000', 401],
    ['42501', 403],
    ['P0002', 404],
    ['22023', 400],
    ['22P02', 400],
    ['XX000', 500],
  ] as const)(
    'maps %s without disclosing internal error/credential text',
    async (code, status) => {
      single.mockResolvedValue({
        data: null,
        error: { code, message: issued.key },
      })
      const response = await PATCH(request({ project_id: projectId, id: 3 }))
      expect(response.status).toBe(status)
      expect(await response.text()).not.toContain(issued.key)
    },
  )
  it('rejects missing issue result', async () => {
    single.mockResolvedValue({ data: null, error: null })
    expect((await POST(request({ project_id: projectId }))).status).toBe(500)
  })
  it('revokes via RPC, not hard deletion', async () => {
    rpc.mockResolvedValue({ data: 3, error: null })
    const response = await DELETE(request(undefined, '?id=3'))
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('revoke_api_key', {
      p_key_id: 3,
    })
    expect(from).not.toHaveBeenCalled()
  })
  it.each([null, 4])(
    'rejects revoke no-op/mismatched result %j',
    async (data) => {
      rpc.mockResolvedValue({ data, error: null })
      expect((await DELETE(request(undefined, '?id=3'))).status).toBe(500)
    },
  )
  it('reports an already revoked key as failure', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002' } })
    expect((await DELETE(request(undefined, '?id=3'))).status).toBe(404)
  })
})
