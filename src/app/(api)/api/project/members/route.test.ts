// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, getUser, createClient } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient }))
import { PATCH } from './route'

const payload = {
  project_id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  role_id: '33333333-3333-4333-8333-333333333333',
}
const request = (body: unknown) =>
  new NextRequest('https://hotlog.invalid/api/project/members', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  createClient.mockResolvedValue({ auth: { getUser }, rpc })
  getUser.mockResolvedValue({
    data: { user: { id: payload.user_id } },
    error: null,
  })
  rpc.mockResolvedValue({ error: null })
})

describe('PATCH /api/project/members', () => {
  it('passes validated identifiers to the typed atomic RPC and preserves the DTO', async () => {
    const response = await PATCH(request(payload))
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('update_user_role', {
      p_project_id: payload.project_id,
      p_user_id: payload.user_id,
      p_role_id: payload.role_id,
    })
    expect(await response.json()).toEqual({
      data: { userId: payload.user_id, roleId: payload.role_id },
    })
  })

  it.each([
    null,
    [],
    'not an object',
    {},
    { ...payload, project_id: 'foreign' },
    { ...payload, user_id: 12 },
    { ...payload, role_id: null },
    { ...payload, role_id: `${payload.role_id} ` },
  ])('rejects malformed identifiers/body without a write: %j', async (body) => {
    const response = await PATCH(request(body))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        message: 'project_id, user_id, and role_id must be valid UUIDs',
      },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON without a write', async () => {
    const response = await PATCH(
      new NextRequest('https://hotlog.invalid/api/project/members', {
        method: 'PATCH',
        body: '{',
      }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { message: 'Invalid JSON body' },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: payload.user_id } }, error: { message: 'expired' } },
  ])('requires an authenticated caller before a write', async (result) => {
    getUser.mockResolvedValueOnce(result)
    const response = await PATCH(request(payload))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { message: 'Unauthorized' },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['28000', 'Unauthorized', 401],
    ['42501', 'Permission denied', 403],
    ['22023', 'Role does not belong to project', 400],
    ['22023', 'User is not a project member', 400],
    ['22P02', 'Invalid UUID', 400],
    ['XX000', 'Unexpected database error', 500],
  ])('maps database %s (%s) to %i', async (code, message, status) => {
    rpc.mockResolvedValueOnce({ error: { code, message } })
    const response = await PATCH(request(payload))
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: { message } })
  })
})
