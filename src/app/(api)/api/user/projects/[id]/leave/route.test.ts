// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
import { POST } from './route'
const id = '11111111-1111-4111-8111-111111111111'
const request = () =>
  new NextRequest('https://hotlog.invalid/api/user/projects/leave', {
    method: 'POST',
    body: JSON.stringify({ user_id: 'someone-else' }),
  })
const invoke = (projectId = id) =>
  POST(request(), { params: Promise.resolve({ id: projectId }) })
beforeEach(() => {
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  })
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'user-a' } },
    error: null,
  })
  mocks.rpc.mockResolvedValue({ data: id, error: null })
})
it('delegates self-leave and cleanup atomically without accepting a user ID', async () => {
  expect((await invoke()).status).toBe(200)
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('leave_project', {
    p_project_id: id,
  })
})
it('rejects cross-origin requests before a membership change', async () => {
  const response = await POST(
    new NextRequest('https://hotlog.invalid/api/user/projects/leave', {
      method: 'POST',
      headers: { origin: 'https://other.invalid' },
    }),
    { params: Promise.resolve({ id }) },
  )
  expect(response.status).toBe(403)
  expect(mocks.rpc).not.toHaveBeenCalled()
})

it('requires authentication', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
  expect((await invoke()).status).toBe(401)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('rejects invalid project identifiers', async () => {
  expect((await invoke('bad')).status).toBe(400)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it.each([
  ['42501', 403],
  ['P0002', 404],
  ['28000', 401],
  ['XX000', 500],
])(
  'preserves failures from the owner/membership/atomicity checks: %s',
  async (code, status) => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code, message: 'Rejected' },
    })
    expect((await invoke()).status).toBe(status)
  },
)
it('reports an undeployed leave migration as unavailable, not a raw database error', async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: {
      code: 'PGRST202',
      message: 'Could not find function public.leave_project',
    },
  })
  const response = await invoke()
  expect(response.status).toBe(503)
  expect((await response.json()).error.message).toBe(
    'Leaving projects is not available until database setup is complete',
  )
})

it('does not report success for an unconfirmed leave', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null })
  expect((await invoke()).status).toBe(500)
})
