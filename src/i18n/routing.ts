import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ru', 'am'],
  defaultLocale: 'en',
})
