import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import messages from '../../../messages/en.json'
import ResetPasswordComponent from './reset-password.component'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mocks }),
}))
vi.mock('@/modules/auth-shared/auth-header', () => ({ default: () => null }))
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))
const t = messages.modules['reset-password']
function renderForm() {
  return render(
    <NextIntlClientProvider locale='en' messages={messages}>
      <ResetPasswordComponent />
    </NextIntlClientProvider>,
  )
}
async function fill(password = 'abcdef', confirmation = password) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(t.password), password)
  await user.type(screen.getByLabelText(t.confirmation), confirmation)
  await user.click(screen.getByRole('button', { name: t.submit }))
  return user
}
beforeEach(() => {
  mocks.getUser
    .mockReset()
    .mockResolvedValue({ data: { user: { id: 'synthetic' } }, error: null })
  mocks.updateUser.mockReset().mockResolvedValue({ error: null })
  mocks.signOut.mockReset().mockResolvedValue({ error: null })
})

describe('reset password form', () => {
  it('updates the password, signs out and returns to sign-in with confirmation', async () => {
    renderForm()
    await fill()
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/sign-in?recovery=complete'),
    )
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'abcdef' })
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.updateUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signOut.mock.invocationCallOrder[0],
    )
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.replace.mock.invocationCallOrder[0],
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['abcde', 'abcde', messages.modules['sign-up'].validation.password.min],
    ['abcdef', 'different', t.mismatch],
  ])(
    'rejects weak or mismatched passwords (%s)',
    async (password, confirmation, error) => {
      renderForm()
      await fill(password, confirmation)
      expect(await screen.findByText(error)).toBeVisible()
      expect(mocks.updateUser).not.toHaveBeenCalled()
    },
  )

  it.each(['missing', 'expired', 'thrown'])(
    'shows a new-link action for %s sessions',
    async (failure) => {
      if (failure === 'thrown')
        mocks.getUser.mockRejectedValue(new Error('expired'))
      else
        mocks.getUser.mockResolvedValue({
          data: { user: null },
          error: failure === 'expired' ? new Error('expired') : null,
        })
      renderForm()
      expect(await screen.findByRole('alert')).toHaveTextContent(t.invalid)
      expect(screen.queryByLabelText(t.password)).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: t.requestLink })).toHaveAttribute(
        'href',
        '/forgot-password',
      )
      expect(mocks.updateUser).not.toHaveBeenCalled()
    },
  )

  it.each(['returned', 'thrown'])(
    'retains the form and shows a safe %s update error',
    async (failure) => {
      if (failure === 'returned')
        mocks.updateUser.mockResolvedValue({
          error: new Error('provider secret'),
        })
      else mocks.updateUser.mockRejectedValue(new Error('provider secret'))
      renderForm()
      await fill()
      expect(await screen.findByRole('alert')).toHaveTextContent(t.error)
      expect(screen.getByLabelText(t.password)).toHaveValue('abcdef')
      expect(mocks.signOut).not.toHaveBeenCalled()
      expect(mocks.replace).not.toHaveBeenCalled()
    },
  )

  it('disables repeat submits while the update is pending', async () => {
    let finish!: (value: { error: null }) => void
    mocks.updateUser.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderForm()
    const user = await fill()
    const button = screen.getByRole('button', { name: t.saving })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(mocks.updateUser).toHaveBeenCalledTimes(1)
    await act(async () => {
      finish({ error: null })
    })
  })

  it('retries sign-out without updating the password again', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: new Error('offline') })
    renderForm()
    const user = await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent(t.signOutError)
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(t.password)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: t.signIn }))
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/sign-in?recovery=complete'),
    )
    expect(mocks.updateUser).toHaveBeenCalledTimes(1)
    expect(mocks.signOut).toHaveBeenCalledTimes(2)
  })
})
