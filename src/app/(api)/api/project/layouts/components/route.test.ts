// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, getUser, createClient } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient }))
import { POST } from './route'

const component = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Count',
  description: 'Events',
  visualization: 'line',
  schema_id: null,
  inputs_ids: [{ inputId: 'x', fieldKey: 'created' }],
  index: 0,
  span: 'half',
  layout_id: 42,
}
const payload = {
  layout_id: 42,
  creates: [
    {
      title: 'New',
      visualization: 'line',
      schema_id: null,
      bindings: [],
      index: 2,
    },
  ],
  updates: [{ id: component.id, title: 'Changed', schema_id: null }],
  deletes: ['22222222-2222-4222-8222-222222222222'],
}
const request = (body: unknown) =>
  new NextRequest('https://hotlog.invalid/api/project/layouts/components', {
    method: 'POST',
    body: JSON.stringify(body),
  })

beforeEach(() => {
  createClient.mockResolvedValue({ auth: { getUser }, rpc })
  getUser.mockResolvedValue({
    data: { user: { id: 'synthetic-user' } },
    error: null,
  })
  rpc.mockResolvedValue({ data: [component], error: null })
})

describe('POST /api/project/layouts/components', () => {
  it('sends all actions and the layout to one RPC and preserves the DTO', async () => {
    const response = await POST(request(payload))
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('batch_layout_components', {
      p_layout_id: payload.layout_id,
      p_creates: payload.creates,
      p_updates: payload.updates,
      p_deletes: payload.deletes,
    })
    expect(await response.json()).toEqual({
      data: [
        {
          id: component.id,
          title: component.name,
          description: component.description,
          visualization: component.visualization,
          schemaId: null,
          bindings: component.inputs_ids,
          index: 0,
          span: 'half',
        },
      ],
    })
  })

  it('defaults omitted action arrays without making separate reads or writes', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null })
    const response = await POST(request({ layout_id: 42 }))
    expect(rpc).toHaveBeenCalledExactlyOnceWith('batch_layout_components', {
      p_layout_id: 42,
      p_creates: [],
      p_updates: [],
      p_deletes: [],
    })
    expect(await response.json()).toEqual({ data: [] })
  })

  it('retains legacy bindings/span response fallbacks', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ ...component, inputs_ids: {}, span: null }],
      error: null,
    })
    const response = await POST(request(payload))
    expect((await response.json()).data[0]).toMatchObject({
      bindings: [],
      span: 'full',
    })
  })

  it.each([
    null,
    [],
    'batch',
    {},
    { layout_id: '42' },
    { layout_id: 0 },
    { layout_id: -1 },
    { layout_id: 1.5 },
    { layout_id: Number.MAX_SAFE_INTEGER + 1 },
    { ...payload, creates: null },
    { ...payload, updates: {} },
    { ...payload, deletes: 'id' },
  ])('rejects invalid top-level payloads before RPC: %j', async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON', async () => {
    const response = await POST(
      new NextRequest('https://hotlog.invalid/api/project/layouts/components', {
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
    { data: { user: { id: 'synthetic-user' } }, error: { message: 'expired' } },
  ])('requires authenticated caller', async (result) => {
    getUser.mockResolvedValueOnce(result)
    expect((await POST(request(payload))).status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['28000', 'Unauthorized', 401],
    ['42501', 'Permission denied', 403],
    ['42501', 'Component unavailable in requested layout', 403],
    ['22023', 'Schema does not belong to layout project', 400],
    ['22023', 'Duplicate component ID', 400],
    ['22P02', 'Invalid UUID', 400],
    ['22003', 'Index overflow', 400],
    ['XX000', 'Forced insert failure', 500],
  ])(
    'rejects the entire RPC response on %s (%s)',
    async (code, message, status) => {
      rpc.mockResolvedValueOnce({ data: null, error: { code, message } })
      const response = await POST(request(payload))
      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ error: { message } })
      expect(rpc).toHaveBeenCalledTimes(1)
    },
  )

  it('does not turn a missing result into false success', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    expect((await POST(request(payload))).status).toBe(500)
  })
})
