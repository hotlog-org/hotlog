// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { cn } from '@/shared/utils/shadcn.utils'

const fetchDuringModuleInitialization = fetch

describe('Node unit test harness', () => {
  it('supports route-style Request/Response mocks and app aliases without a DOM', async () => {
    expect(typeof document).toBe('undefined')
    expect(cn('px-2', 'px-4')).toBe('px-4')
    const request = new Request('https://unit-test.invalid')
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ok: true }))

    const response = await fetch(request)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('also blocks unmocked fetches in the Node environment', async () => {
    await expect(fetch('https://unit-test.invalid')).rejects.toThrow(
      'Unexpected fetch: mock the request',
    )
  })

  it('installs the fetch guard before test modules initialize', async () => {
    expect(vi.isMockFunction(fetchDuringModuleInitialization)).toBe(true)
    await expect(
      fetchDuringModuleInitialization('https://unit-test.invalid'),
    ).rejects.toThrow('Unexpected fetch: mock the request')
  })
})
