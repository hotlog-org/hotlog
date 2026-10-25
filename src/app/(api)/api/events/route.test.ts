// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, createClient } = vi.hoisted(() => ({
  rpc: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient }))
import { POST } from './route'

const limit = 65536
const encode = (value: string) => new TextEncoder().encode(value)
function payload(size: number, character: string) {
  const shell = JSON.stringify({ schema_key: 'test', value: { text: '' } })
  const available = size - encode(shell).length
  const text =
    character.repeat(Math.floor(available / encode(character).length)) +
    'a'.repeat(available % encode(character).length)
  return encode(JSON.stringify({ schema_key: 'test', value: { text } }))
}
function request(
  body: Uint8Array | ReadableStream<Uint8Array>,
  headers: Record<string, string> = {},
) {
  return new NextRequest('https://hotlog.invalid/api/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer synthetic-test-only',
      ...headers,
    },
    body: body as BodyInit,
    duplex: 'half',
  } as ConstructorParameters<typeof NextRequest>[1])
}

beforeEach(() => {
  createClient.mockResolvedValue({ rpc })
  rpc.mockImplementation(async (name: string) =>
    name === 'get_active_fields_for_ingest'
      ? { data: [], error: null }
      : { data: [{ id: 1, created_at: '2026-01-01' }], error: null },
  )
})

describe('POST /api/events bounded bytes', () => {
  it.each(['a', 'é', '😀'])(
    'accepts exactly 64KiB of %s JSON',
    async (character) => {
      const bytes = payload(limit, character)
      expect(bytes.length).toBe(limit)
      const response = await POST(
        request(bytes, { 'content-length': String(limit + 100) }),
      )
      expect(response.status).toBe(201)
      expect(rpc).toHaveBeenCalledTimes(2)
    },
  )

  it.each(['a', 'é', '😀'])(
    'rejects 64KiB+1 of %s despite misleading Content-Length',
    async (character) => {
      const response = await POST(
        request(payload(limit + 1, character), { 'content-length': '1' }),
      )
      expect(response.status).toBe(413)
      expect(await response.json()).toEqual({
        error: { message: 'Payload too large' },
      })
      expect(createClient).not.toHaveBeenCalled()
      expect(rpc).not.toHaveBeenCalled()
    },
  )

  it('decodes multibyte characters split across arbitrary chunk boundaries', async () => {
    const bytes = payload(limit, '😀')
    let offset = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === bytes.length) return controller.close()
        const end = Math.min(bytes.length, offset + 137)
        controller.enqueue(bytes.slice(offset, end))
        offset = end
      },
    })
    expect((await POST(request(stream))).status).toBe(201)
    const value = rpc.mock.calls[1][1].p_value
    expect(value.text).not.toContain('�')
  })

  it('cancels on overflow without reading or buffering the remainder', async () => {
    const cancel = vi.fn(() => new Promise<void>(() => {}))
    let pulls = 0
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls++
          controller.enqueue(new Uint8Array(pulls === 1 ? limit : 1))
        },
        cancel,
      },
      { highWaterMark: 0 },
    )
    expect((await POST(request(stream))).status).toBe(413)
    expect(pulls).toBe(2)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('preserves content-type, auth, size, JSON and schema-key status ordering', async () => {
    expect(
      (
        await POST(
          request(payload(limit + 1, 'a'), {
            'content-type': 'text/plain',
            authorization: '',
          }),
        )
      ).status,
    ).toBe(415)
    expect(
      (await POST(request(payload(limit + 1, 'a'), { authorization: '' })))
        .status,
    ).toBe(401)
    expect((await POST(request(new Uint8Array(limit + 1)))).status).toBe(413)
    for (const invalid of ['', '{', 'null', '{}']) {
      expect((await POST(request(encode(invalid)))).status).toBe(400)
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('propagates stream failures without calling RPC', async () => {
    const failure = new Error('Disconnected')
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(failure)
      },
    })
    await expect(POST(request(stream))).rejects.toBe(failure)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('POST /api/events database validation', () => {
  const body = () =>
    request(encode(JSON.stringify({ schema_key: 'test', value: { x: 1 } })))

  it.each(['event_value_invalid', 'event_schema_invalid'])(
    'maps %s field details after prevalidation succeeds',
    async (message) => {
      const fieldErrors = [{ field_key: 'x[0]', reason: 'expected string' }]
      rpc
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: '22023',
            message,
            details: JSON.stringify(fieldErrors),
          },
        })
      const response = await POST(body())
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: {
          message: 'Event value failed schema validation',
          field_errors: fieldErrors,
        },
      })
      expect(rpc).toHaveBeenLastCalledWith('ingest_event', {
        p_api_key: 'synthetic-test-only',
        p_schema_key: 'test',
        p_value: { x: 1 },
      })
    },
  )

  it.each([
    null,
    '',
    'not JSON',
    '{}',
    '[null]',
    '[{"field_key":1,"reason":"invalid"}]',
  ])(
    'handles malformed database details %s without leaking them',
    async (details) => {
      rpc
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { code: '22023', message: 'event_value_invalid', details },
        })
      const response = await POST(body())
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: { message: 'Event value failed schema validation' },
      })
    },
  )

  it.each([
    ['P0001', 'invalid_api_key', 401, 'Invalid API key'],
    ['P0002', 'schema_not_found', 404, 'Schema not found or not active'],
    ['XX000', 'private SQL statement', 500, 'Failed to store event'],
    ['22023', 'unrecognized database error', 500, 'Failed to store event'],
  ])(
    'preserves safe %s mapping',
    async (code, message, status, expectedMessage) => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { code, message, details: 'private SQL details' },
      })
      const response = await POST(body())
      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({
        error: { message: expectedMessage },
      })
      expect(rpc).toHaveBeenCalledTimes(1)
    },
  )

  it('keeps prevalidation errors and skips ingest on invalid input', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ key: 'x', type: 'STRING', required: true, metadata: null }],
      error: null,
    })
    const response = await POST(body())
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        message: 'Event value failed schema validation',
        field_errors: [{ field_key: 'x', reason: 'expected string' }],
      },
    })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('preserves SDK success DTO', async () => {
    const response = await POST(body())
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { id: 1, createdAt: '2026-01-01' },
    })
  })
})
