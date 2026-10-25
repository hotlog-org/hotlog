// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: db.createClient }))
import { POST, PATCH } from './route'

const archived = {
  id: 'schema-a',
  key: 'order_created',
  display_name: 'Original name',
  status: 'archived',
}
const request = (
  method = 'POST',
  body: unknown = {
    project_id: 'project-a',
    key: archived.key,
    display_name: 'Order Created',
  },
) =>
  new NextRequest('https://hotlog.invalid/api/project/schemas', {
    method,
    body: JSON.stringify(body),
  })

beforeEach(() => {
  const query = {
    insert: db.insert,
    update: db.update,
    select: db.select,
    eq: db.eq,
    single: db.single,
    maybeSingle: db.maybeSingle,
  }
  for (const fn of [db.from, db.insert, db.update, db.select, db.eq])
    fn.mockReturnValue(query)
  db.createClient.mockResolvedValue({
    auth: { getUser: db.getUser },
    from: db.from,
  })
  db.getUser.mockResolvedValue({
    data: { user: { id: 'user-a' } },
    error: null,
  })
  db.single.mockResolvedValue({ data: null, error: { code: '23505' } })
  db.maybeSingle.mockResolvedValue({ data: archived, error: null })
})

it('returns a distinct archived-key conflict without restoring or changing anything', async () => {
  const response = await POST(request())
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: {
      code: 'SCHEMA_KEY_ARCHIVED',
      schema: {
        id: archived.id,
        key: archived.key,
        displayName: archived.display_name,
      },
    },
  })
  expect(db.eq).toHaveBeenCalledWith('project_id', 'project-a')
  expect(db.eq).toHaveBeenCalledWith('key', archived.key)
  expect(db.update).not.toHaveBeenCalled()
  expect(db.from.mock.calls.every(([table]) => table === 'schemas')).toBe(true)
})

it('returns an ordinary conflict for an active schema', async () => {
  db.maybeSingle.mockResolvedValue({
    data: { ...archived, status: 'active' },
    error: null,
  })
  const response = await POST(request())
  expect(response.status).toBe(409)
  expect((await response.json()).error).toEqual({
    code: 'SCHEMA_KEY_EXISTS',
    message: 'A schema with this key already exists in this project',
  })
})

it('does not expose a conflicting row hidden by RLS or a failed lookup', async () => {
  db.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Hidden' } })
  const response = await POST(request())
  expect(response.status).toBe(409)
  expect((await response.json()).error.schema).toBeUndefined()
})

it('still creates a new schema normally', async () => {
  db.single.mockResolvedValue({
    data: { ...archived, status: 'active', created_at: '' },
    error: null,
  })
  expect((await POST(request())).status).toBe(201)
  expect(db.maybeSingle).not.toHaveBeenCalled()
})

it('requires authentication before conflict lookup', async () => {
  db.getUser.mockResolvedValue({ data: { user: null }, error: null })
  expect((await POST(request())).status).toBe(401)
  expect(db.from).not.toHaveBeenCalled()
})

it('restores explicitly via PATCH without touching fields or historical events', async () => {
  db.single.mockResolvedValue({
    data: { ...archived, status: 'active', created_at: '' },
    error: null,
  })
  const response = await PATCH(
    request('PATCH', { id: archived.id, status: 'active' }),
  )
  expect(response.status).toBe(200)
  expect(db.update).toHaveBeenCalledExactlyOnceWith({ status: 'active' })
  expect(db.eq).toHaveBeenCalledWith('id', archived.id)
  expect(db.from).toHaveBeenCalledExactlyOnceWith('schemas')
  expect((await response.json()).data.id).toBe(archived.id)
})

it('does not report restoration as successful when RLS rejects the update', async () => {
  db.single.mockResolvedValue({
    data: null,
    error: { code: '42501', message: 'Permission denied' },
  })
  const response = await PATCH(
    request('PATCH', { id: archived.id, status: 'active' }),
  )
  expect(response.ok).toBe(false)
  expect((await response.json()).error.message).toBe('Permission denied')
})
