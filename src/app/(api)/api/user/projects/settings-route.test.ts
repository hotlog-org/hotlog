// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
import { GET, DELETE } from './route'
const id = '11111111-1111-4111-8111-111111111111'
const request = () =>
  new NextRequest(`https://hotlog.invalid/api/user/projects?project_id=${id}`, {
    method: 'DELETE',
  })
beforeEach(() => {
  const query = {
    delete: mocks.delete,
    eq: mocks.eq,
    select: mocks.select,
    order: mocks.order,
    maybeSingle: mocks.maybeSingle,
  }
  for (const fn of [mocks.from, mocks.delete, mocks.eq, mocks.select])
    fn.mockReturnValue(query)
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  })
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'user-a' } },
    error: null,
  })
  mocks.rpc.mockResolvedValue({ data: false, error: null })
  mocks.order.mockResolvedValue({
    data: [
      {
        id,
        name: 'Owned',
        created_at: '',
        creator_id: 'user-a',
        can_delete: true,
      },
    ],
    error: null,
  })
  mocks.maybeSingle.mockResolvedValue({ data: { id }, error: null })
})
it('lists actual ownership and server-evaluated project-delete capability', async () => {
  const response = await GET()
  expect(mocks.from).toHaveBeenCalledWith('projects')
  expect(mocks.rpc).not.toHaveBeenCalled()
  expect((await response.json()).data).toEqual([
    { id, name: 'Owned', createdAt: '', isCreator: true, canDelete: true },
  ])
})
it('keeps list failures distinct from an empty project list', async () => {
  mocks.order.mockResolvedValue({
    data: null,
    error: { message: 'Unavailable' },
  })
  expect((await GET()).status).toBe(500)
})
it.each([true, false])(
  'checks a joined project using the already-deployed permission helper: %s',
  async (canDelete) => {
    mocks.order.mockResolvedValue({
      data: [{ id, name: 'Joined', created_at: '', creator_id: 'other-user' }],
      error: null,
    })
    mocks.rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'has_permission'
          ? { data: canDelete, error: null }
          : { data: null, error: { code: 'PGRST202' } },
      ),
    )
    const response = await GET()
    expect(response.status).toBe(200)
    expect((await response.json()).data[0]).toMatchObject({
      id,
      isCreator: false,
      canDelete,
    })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('has_permission', {
      p_project_id: id,
      p_action: 'delete',
      p_subject: 'projects',
    })
  },
)

it('fails closed if project capability lookup fails', async () => {
  mocks.order.mockResolvedValue({
    data: [{ id, name: 'Joined', created_at: '', creator_id: 'other-user' }],
    error: null,
  })
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { message: 'Permission failed' },
  })
  expect((await GET()).status).toBe(500)
})

it('only reports project deletion when the RLS DELETE returned a row', async () => {
  const response = await DELETE(request())
  expect(response.status).toBe(200)
  expect(mocks.eq).toHaveBeenCalledWith('id', id)
  expect(mocks.select).toHaveBeenCalledWith('id')
})
it('does not silently succeed when RLS filtered out the delete', async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  expect((await DELETE(request())).status).toBe(404)
})
it('does not report a failed project delete as success', async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: null,
    error: { message: 'Failed' },
  })
  expect((await DELETE(request())).status).toBe(500)
})
it('authenticates project listing and deletion', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
  expect((await GET()).status).toBe(401)
  expect((await DELETE(request())).status).toBe(401)
  expect(mocks.from).not.toHaveBeenCalled()
  expect(mocks.rpc).not.toHaveBeenCalled()
})
