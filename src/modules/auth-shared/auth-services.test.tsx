import { act, renderHook, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import messages from '../../../messages/en.json'
import { useForgotPasswordService } from '@/modules/forgot-password/forgot-password.service'
import { useLoginService } from '@/modules/login/login.service'
import { useSignUpService } from '@/modules/sign-up/sign-up.service'

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  push: vi.fn(),
  search: new URLSearchParams(),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
  }),
}))
vi.mock('@/modules/login/login.action', () => ({
  loginAction: mocks.login,
  socialLoginAction: vi.fn(),
}))
vi.mock('@/modules/sign-up/sign-up.action', () => ({
  signUpAction: mocks.signup,
}))
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.search }))
const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale='ru' messages={messages}>
    {children}
  </NextIntlClientProvider>
)

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null })
  mocks.login.mockReset().mockResolvedValue({ success: true })
  mocks.signup.mockReset().mockResolvedValue({ success: true })
})

describe('login and signup redirect sinks', () => {
  for (const [name, hook] of [
    ['login', useLoginService],
    ['signup', useSignUpService],
  ] as const) {
    it.each([
      '//evil.invalid',
      '/ru//evil.invalid',
      '/\\evil.invalid',
      '/\n/evil.invalid',
      'https://evil.invalid',
      'javascript:alert(1)',
    ])(`${name} rejects %s`, async (next) => {
      mocks.search.set('next', next)
      const { result } = renderHook(hook, { wrapper })
      await act(() =>
        result.current.onSubmit({
          email: 'synthetic@example.invalid',
          password: 'abcdef',
        }),
      )
      expect(mocks.push).toHaveBeenCalledWith('/dashboard', {
        locale: undefined,
      })
    })
    it(`${name} preserves localized invitation paths without double prefixing`, async () => {
      mocks.search.set('next', '/am/invite/accept?token=synthetic#details')
      const { result } = renderHook(hook, { wrapper })
      await act(() =>
        result.current.onSubmit({
          email: 'synthetic@example.invalid',
          password: 'abcdef',
        }),
      )
      expect(mocks.push).toHaveBeenCalledWith(
        '/invite/accept?token=synthetic#details',
        { locale: 'am' },
      )
    })
  }
})

describe('forgot password', () => {
  it('sends a real provider request with localized PKCE redirect and neutral success', async () => {
    const { result } = renderHook(useForgotPasswordService, { wrapper })
    await act(() =>
      result.current.onSubmit({ email: 'synthetic@example.invalid' }),
    )
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'synthetic@example.invalid',
      { redirectTo: `${window.location.origin}/ru/auth/callback?recovery=1` },
    )
    expect(result.current.success).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.t('success')).toMatch(/If an account exists/)
  })

  it.each(['returned', 'thrown'])(
    'shows %s errors instead of fake success',
    async (failure) => {
      if (failure === 'returned')
        mocks.resetPasswordForEmail.mockResolvedValue({
          error: new Error('provider secret'),
        })
      else
        mocks.resetPasswordForEmail.mockRejectedValue(
          new Error('provider secret'),
        )
      const { result } = renderHook(useForgotPasswordService, { wrapper })
      await act(() =>
        result.current.onSubmit({ email: 'synthetic@example.invalid' }),
      )
      expect(result.current.success).toBe(false)
      expect(result.current.error).toBe(
        messages.modules['forgot-password'].error,
      )
      expect(result.current.isLoading).toBe(false)
    },
  )

  it('guards repeated submissions and exposes loading', async () => {
    let finish!: (value: { error: null }) => void
    mocks.resetPasswordForEmail.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const { result } = renderHook(useForgotPasswordService, { wrapper })
    let first!: Promise<void>
    act(() => {
      first = result.current.onSubmit({ email: 'synthetic@example.invalid' })
    })
    await act(() =>
      result.current.onSubmit({ email: 'synthetic@example.invalid' }),
    )
    expect(result.current.isLoading).toBe(true)
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1)
    await act(async () => {
      finish({ error: null })
      await first
    })
    expect(result.current.success).toBe(true)
  })

  it('does not submit an invalid email through the form', async () => {
    const { result } = renderHook(useForgotPasswordService, { wrapper })
    await act(() => result.current.form.handleSubmit(result.current.onSubmit)())
    await waitFor(() =>
      expect(result.current.form.getFieldState('email').invalid).toBe(true),
    )
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled()
  })
})
