import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ru', 'am'],
  defaultLocale: 'en',
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
})
