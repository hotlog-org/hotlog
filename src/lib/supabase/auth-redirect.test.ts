import { describe, expect, it } from 'vitest'
import {
  authDestination,
  authNavigation,
  safeAuthRedirect,
} from './auth-redirect'

const origin = 'https://hotlog.invalid'

describe('safeAuthRedirect', () => {
  it.each([
    null,
    '',
    'https://evil.invalid',
    'https://hotlog.invalid/en/dashboard',
    '//evil.invalid',
    '///evil.invalid',
    '/\\evil.invalid',
    '\\evil.invalid',
    '/en/\\evil',
    '/\t/evil',
    '/\n/evil',
    '/\r/evil',
    '/\u0000evil',
    '/\u007fevil',
    '/%5cevil',
    '/%0aevil',
    '/%00evil',
    '/%zz',
    '/%',
    ' /en/dashboard',
    'javascript:alert(1)',
    '/../..//evil.invalid',
    '/en//evil.invalid',
    '/ru/../am//evil.invalid',
  ])('rejects unsafe input %j', (value) => {
    expect(safeAuthRedirect(value, origin, '/fallback')).toBe('/fallback')
  })

  it.each([
    '/en/dashboard',
    '/ru/invite/accept?token=synthetic%2Btoken#details',
    '/am/invite/accept?token=synthetic',
    '/invite/accept?token=synthetic%252F',
    '/en/dashboard?label=hello%20world#events',
  ])('preserves safe local input %s', (value) => {
    expect(safeAuthRedirect(value, origin, '/fallback')).toBe(value)
  })

  it('normalizes local segments', () => {
    expect(safeAuthRedirect('/en/./dashboard', origin, '/fallback')).toBe(
      '/en/dashboard',
    )
  })

  it('avoids double locale prefixes at next-intl navigation sinks', () => {
    const destination = authNavigation(
      '/ru/invite/accept?token=synthetic#details',
    )
    expect(destination).toEqual({
      pathname: '/invite/accept?token=synthetic#details',
      locale: 'ru',
    })
    expect(authNavigation('/invite/accept?token=synthetic')).toEqual({
      pathname: '/invite/accept?token=synthetic',
      locale: undefined,
    })
  })

  it('strips auth credentials without stripping invitation tokens', () => {
    expect(
      authDestination(
        '/en/invite/accept?token=synthetic&code=secret&token_hash=secret&access_token=secret&refresh_token=secret#access_token=secret',
        origin,
      ).toString(),
    ).toBe(`${origin}/en/invite/accept?token=synthetic`)
  })
})
