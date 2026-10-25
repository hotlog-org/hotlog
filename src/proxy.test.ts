// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server'
import { expect, it, vi } from 'vitest'
import { proxy } from './proxy'

const mocks = vi.hoisted(() => ({ intl: vi.fn(), updateSession: vi.fn() }))
vi.mock('next-intl/middleware', () => ({ default: () => mocks.intl }))
vi.mock('@/lib/supabase/proxy', () => ({ updateSession: mocks.updateSession }))

it('keeps /auth/confirm reachable without locale redirection', async () => {
  const authResponse = NextResponse.next()
  mocks.updateSession.mockResolvedValue(authResponse)
  const result = await proxy(
    new NextRequest(
      'https://hotlog.invalid/auth/confirm?token_hash=synthetic&type=recovery',
    ),
  )
  expect(result).toBe(authResponse)
  expect(mocks.intl).not.toHaveBeenCalled()
})

it('retains locale middleware and refreshed cookies for localized auth routes', async () => {
  const authResponse = NextResponse.next()
  authResponse.cookies.set('synthetic-session', 'test')
  mocks.updateSession.mockResolvedValue(authResponse)
  mocks.intl.mockReturnValue(NextResponse.next())
  const result = await proxy(
    new NextRequest('https://hotlog.invalid/ru/reset-password'),
  )
  expect(mocks.intl).toHaveBeenCalledTimes(1)
  expect(result.cookies.get('synthetic-session')?.value).toBe('test')
})
