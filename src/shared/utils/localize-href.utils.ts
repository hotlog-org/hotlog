'use client'

import { useLocale } from 'next-intl'
import { usePathname as useNextPathname } from 'next/navigation'

export const useLocalizeHref = () => {
  const locale = useLocale()
  const pathname = useNextPathname()

  const localizeHref = (href: string) => {
    const currentLocale = locale || 'en'
    const isLocalizedPath = pathname.startsWith(`/${currentLocale}`)

    if (isLocalizedPath) {
      if (href.startsWith('/')) {
        return `/${currentLocale}${href}`
      }
      return href
    }

    if (href.startsWith('/')) {
      return `/${currentLocale}${href}`
    }
    return href
  }

  return { localizeHref }
}

export const localizeHref = (href: string, locale?: string) => {
  const currentLocale = locale || 'en'

  if (href.startsWith('/')) {
    return `/${currentLocale}${href}`
  }
  return href
}
