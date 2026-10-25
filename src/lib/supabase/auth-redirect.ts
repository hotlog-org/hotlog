import { routing } from '@/i18n/routing'

// Callers supply a trusted origin and a constant local fallback. Never decode twice.
export function safeAuthRedirect(
  value: string | null,
  origin: string,
  fallback: string,
): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020\u007f]/.test(value) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(value) ||
    /%(?![0-9a-f]{2})/i.test(value)
  ) {
    return fallback
  }

  try {
    const url = new URL(value, origin)
    if (
      url.origin !== origin ||
      url.pathname.startsWith('//') ||
      // Removing the locale for next-intl must not produce a protocol-relative URL.
      routing.locales.some((locale) => url.pathname.startsWith(`/${locale}//`))
    )
      return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

// next-intl adds a locale prefix itself; do not prefix an already localized next twice.
export function authNavigation(path: string) {
  const match = path.match(/^\/([^/?#]+)(?=\/|\?|#|$)/)
  const locale = routing.locales.find((locale) => locale === match?.[1])
  const rest = locale ? path.slice(locale.length + 1) : path
  return { pathname: rest.startsWith('/') ? rest : `/${rest}`, locale }
}

export function authLocale(value: string | null | undefined) {
  return (
    routing.locales.find((locale) => locale === value) ?? routing.defaultLocale
  )
}

// Do not forward authentication credentials, even when supplied inside `next`.
export function authDestination(path: string, origin: string) {
  const url = new URL(path, origin)
  const secrets = [
    'code',
    'token_hash',
    'access_token',
    'refresh_token',
    'id_token',
  ]
  for (const name of secrets) url.searchParams.delete(name)
  const fragment = new URLSearchParams(url.hash.slice(1))
  if (secrets.some((name) => fragment.has(name))) url.hash = ''
  return url
}
