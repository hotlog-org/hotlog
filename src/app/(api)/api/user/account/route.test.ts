// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  getClaims: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  deleteUser: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))
import { DELETE } from './route'
const user = { id: 'user-a', email: 'sam@invalid.test' }
const request = (
  body: unknown = { confirmation: user.email, user_id: 'different-user' },
) =>
  new NextRequest('https://hotlog.invalid/api/user/account', {
    method: 'DELETE',
    body: JSON.stringify(body),
  })
beforeEach(() => {
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: mocks.getUser,
      getClaims: mocks.getClaims,
      signOut: mocks.signOut,
    },
    rpc: mocks.rpc,
  })
  mocks.createAdminClient.mockReturnValue({
    auth: { admin: { deleteUser: mocks.deleteUser } },
  })
  mocks.getUser.mockResolvedValue({ data: { user }, error: null })
  mocks.getClaims.mockResolvedValue({
    data: {
      claims: {
        sub: user.id,
        amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }],
      },
    },
    error: null,
  })
  mocks.rpc.mockResolvedValue({ data: user.id, error: null })
  mocks.deleteUser.mockResolvedValue({ error: null })
  mocks.signOut.mockResolvedValue({ error: null })
})
it('deletes only the validated current user after the DB safety gate and clears cookies', async () => {
  const response = await DELETE(request())
  expect(response.status).toBe(200)
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('prepare_account_deletion')
  expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith(user.id)
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
  expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.deleteUser.mock.invocationCallOrder[0],
  )
})
it('authenticates before parsing or invoking privileged operations', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
  expect((await DELETE(request())).status).toBe(401)
  expect(mocks.createAdminClient).not.toHaveBeenCalled()
})
it.each([{}, null, { confirmation: 'wrong' }, { confirmation: 123 }])(
  'requires explicit matching email confirmation: %j',
  async (body) => {
    expect((await DELETE(request(body))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  },
)
it('rejects cross-origin destructive requests before any privileged operation', async () => {
  const response = await DELETE(
    new NextRequest('https://hotlog.invalid/api/user/account', {
      method: 'DELETE',
      headers: { origin: 'https://other.invalid' },
      body: JSON.stringify({ confirmation: user.email }),
    }),
  )
  expect(response.status).toBe(403)
  expect(mocks.createAdminClient).not.toHaveBeenCalled()
})

it('rejects malformed JSON', async () => {
  expect(
    (
      await DELETE(
        new NextRequest('https://hotlog.invalid/api/user/account', {
          method: 'DELETE',
          body: '{',
        }),
      )
    ).status,
  ).toBe(400)
})
it.each(['password', 'oauth', 'otp'])(
  'supports recent %s sign-in',
  async (method) => {
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: user.id,
          amr: [{ method, timestamp: Math.floor(Date.now() / 1000) }],
        },
      },
      error: null,
    })
    expect((await DELETE(request())).status).toBe(200)
  },
)
it.each([
  {
    sub: user.id,
    iat: Math.floor(Date.now() / 1000),
    amr: [
      { method: 'password', timestamp: Math.floor(Date.now() / 1000) - 3600 },
    ],
  },
  {
    sub: user.id,
    amr: [{ method: 'recovery', timestamp: Math.floor(Date.now() / 1000) }],
  },
  {
    sub: 'another-user',
    amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }],
  },
  { sub: user.id },
  { sub: user.id, amr: [null, 'invalid'] },
])(
  'does not mistake refresh/recovery/mismatched claims for reauthentication',
  async (claims) => {
    mocks.getClaims.mockResolvedValue({ data: { claims }, error: null })
    expect((await DELETE(request())).status).toBe(403)
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  },
)
it.each([
  ['23503', 409],
  ['55000', 503],
  ['PGRST202', 503],
])(
  'fails closed for ownership or missing safety migration: %s',
  async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } })
    expect((await DELETE(request())).status).toBe(status)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  },
)
it('fails closed without server-side admin configuration', async () => {
  mocks.createAdminClient.mockReturnValue(null)
  expect((await DELETE(request())).status).toBe(503)
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('rejects an unexpected identity from the safety RPC', async () => {
  mocks.rpc.mockResolvedValue({ data: 'other-user', error: null })
  expect((await DELETE(request())).status).toBe(503)
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('reports a concurrent ownership blocker without signing out', async () => {
  mocks.deleteUser.mockResolvedValue({ error: { message: 'FK blocked' } })
  mocks.rpc
    .mockResolvedValueOnce({ data: user.id, error: null })
    .mockResolvedValueOnce({ data: null, error: { code: '23503' } })
  expect((await DELETE(request())).status).toBe(409)
  expect(mocks.signOut).not.toHaveBeenCalled()
})
it('does not pretend an admin failure succeeded or expose its details', async () => {
  mocks.deleteUser.mockResolvedValue({
    error: { message: 'private server details' },
  })
  const response = await DELETE(request())
  expect(response.status).toBe(500)
  expect(JSON.stringify(await response.json())).not.toContain(
    'private server details',
  )
  expect(mocks.signOut).not.toHaveBeenCalled()
})
