// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, single, getUser, createClient } = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient }))
import { POST } from './route'

const project = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'New project',
  created_at: '2026-10-04T00:00:00Z',
  creator_id: '22222222-2222-4222-8222-222222222222',
}
const request = (body: unknown) =>
  new NextRequest('https://hotlog.invalid/api/user/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  })

beforeEach(() => {
  createClient.mockResolvedValue({ auth: { getUser }, rpc })
  getUser.mockResolvedValue({
    data: { user: { id: project.creator_id } },
    error: null,
  })
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({ data: project, error: null })
})

describe('POST /api/user/projects', () => {
  it('uses one atomic RPC, never passes a caller-supplied creator, and retains the DTO', async () => {
    const response = await POST(
      request({ name: project.name, creator_id: 'spoofed' }),
    )
    expect(response.status).toBe(201)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('create_project', {
      p_name: project.name,
    })
    expect(await response.json()).toEqual({
      data: [
        {
          id: project.id,
          name: project.name,
          createdAt: project.created_at,
          isCreator: true,
        },
      ],
    })
  })

  it.each([null, [], 'name', {}, { name: '' }, { name: '  ' }, { name: 12 }])(
    'rejects malformed names/bodies: %j',
    async (body) => {
      expect((await POST(request(body))).status).toBe(400)
      expect(rpc).not.toHaveBeenCalled()
    },
  )

  it('rejects malformed JSON without a write', async () => {
    const response = await POST(
      new NextRequest('https://hotlog.invalid/api/user/projects', {
        method: 'POST',
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
    {
      data: { user: { id: project.creator_id } },
      error: { message: 'expired' },
    },
  ])('authenticates before invoking the RPC', async (result) => {
    getUser.mockResolvedValueOnce(result)
    expect((await POST(request({ name: project.name }))).status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['28000', 'Unauthorized', 401],
    ['42501', 'Permission denied', 403],
    ['22023', 'name is required', 400],
    ['55000', 'Permission catalog is empty', 500],
    ['XX000', 'Forced role permission failure', 500],
  ])('does not report success for %s', async (code, message, status) => {
    single.mockResolvedValueOnce({ data: null, error: { code, message } })
    const response = await POST(request({ name: project.name }))
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: { message } })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('rejects a missing RPC result', async () => {
    single.mockResolvedValueOnce({ data: null, error: null })
    expect((await POST(request({ name: project.name }))).status).toBe(500)
  })
})
