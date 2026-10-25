// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as callback } from '@/app/(web)/[locale]/auth/callback/route'
import { GET as confirm } from '@/app/(api)/auth/confirm/route'

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth }),
}))
const origin = 'https://hotlog.invalid'
function request(path: string, params: Record<string, string> = {}) {
  return new Request(`${origin}${path}?${new URLSearchParams(params)}`)
}
beforeEach(() => {
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
  auth.verifyOtp.mockReset().mockResolvedValue({ error: null })
})

describe('auth callback', () => {
  it.each([
    '//evil.invalid',
    '/\\evil.invalid',
    '/\n/evil.invalid',
    'https://evil.invalid',
  ])('rejects hostile next %s', async (next) => {
    const response = await callback(
      request('/en/auth/callback', { code: 'synthetic', next }),
    )
    expect(response.headers.get('location')).toBe(`${origin}/en/dashboard`)
  })

  it('preserves a localized invitation and strips callback secrets', async () => {
    const response = await callback(
      request('/ru/auth/callback', {
        code: 'synthetic',
        token_hash: 'synthetic',
        next: '/ru/invite/accept?token=invitation#details',
      }),
    )
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('synthetic')
    expect(response.headers.get('location')).toBe(
      `${origin}/ru/invite/accept?token=invitation#details`,
    )
  })

  it('routes PKCE recovery to the localized form, ignoring hostile next', async () => {
    const response = await callback(
      request('/am/auth/callback', {
        code: 'synthetic',
        recovery: '1',
        next: '//evil.invalid',
      }),
    )
    expect(response.headers.get('location')).toBe(`${origin}/am/reset-password`)
  })

  it.each(['missing', 'expired', 'thrown'])(
    'handles %s recovery code without leaking it',
    async (failure) => {
      if (failure === 'expired')
        auth.exchangeCodeForSession.mockResolvedValue({
          error: new Error('expired'),
        })
      if (failure === 'thrown')
        auth.exchangeCodeForSession.mockRejectedValue(
          new Error('synthetic secret'),
        )
      const response = await callback(
        request('/ru/auth/callback', {
          recovery: '1',
          ...(failure !== 'missing' ? { code: 'synthetic' } : {}),
        }),
      )
      expect(response.headers.get('location')).toBe(
        `${origin}/ru/sign-in?recovery=invalid`,
      )
    },
  )

  it('retains the ordinary missing-code fallback', async () => {
    expect(
      (await callback(request('/ru/auth/callback'))).headers.get('location'),
    ).toBe(`${origin}/en/sign-in`)
  })
})

describe('token-hash confirmation', () => {
  it('verifies recovery then forces a secret-free localized reset destination', async () => {
    const response = await confirm(
      request('/auth/confirm', {
        token_hash: 'synthetic',
        type: 'recovery',
        locale: 'ru',
        next: '//evil.invalid',
        access_token: 'synthetic',
      }),
    )
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'synthetic',
      type: 'recovery',
    })
    expect(response.headers.get('location')).toBe(`${origin}/ru/reset-password`)
  })

  it('preserves safe invitation destinations for other email confirmations', async () => {
    const response = await confirm(
      request('/auth/confirm', {
        token_hash: 'synthetic',
        type: 'signup',
        next: '/am/invite/accept?token=invitation&code=secret',
      }),
    )
    expect(response.headers.get('location')).toBe(
      `${origin}/am/invite/accept?token=invitation`,
    )
  })

  it.each(['missing', 'invalid-type', 'expired', 'reused', 'thrown'])(
    'handles %s tokens on an existing page',
    async (failure) => {
      if (failure === 'expired' || failure === 'reused')
        auth.verifyOtp.mockResolvedValue({ error: new Error(failure) })
      if (failure === 'thrown')
        auth.verifyOtp.mockRejectedValue(new Error('secret'))
      const response = await confirm(
        request('/auth/confirm', {
          type: failure === 'invalid-type' ? 'sms' : 'recovery',
          locale: '//evil.invalid',
          ...(failure !== 'missing' ? { token_hash: 'synthetic' } : {}),
        }),
      )
      expect(response.headers.get('location')).toBe(
        `${origin}/en/sign-in?${failure === 'invalid-type' ? 'auth' : 'recovery'}=invalid`,
      )
      if (failure === 'missing' || failure === 'invalid-type')
        expect(auth.verifyOtp).not.toHaveBeenCalled()
    },
  )
})
