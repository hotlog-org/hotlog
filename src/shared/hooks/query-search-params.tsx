'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { routing } from '@/i18n/routing'

export const useQuerySearchParams = () => {
  const { replace } = useRouter()

  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hash = typeof window !== 'undefined' ? window.location.hash : null
  const hashParams = new URLSearchParams(hash?.slice(1))

  const changeQuery = (
    queries: { name: string; value?: string }[],
    scroll?: boolean,
  ) => {
    const params = new URLSearchParams(searchParams)

    for (const param of queries) {
      if (param.value) {
        params.set(param.name, param.value)
      } else {
        params.delete(param.name)
      }
    }

    const queryString = params.toString()

    const segments = pathname.split('/').filter(Boolean)
    const firstSegment = segments[0]
    const isLocalized = routing.locales.includes(firstSegment)

    const basePath = isLocalized
      ? pathname
      : `/${routing.defaultLocale}${pathname}`
    const nextHref = basePath + (queryString ? `?${queryString}` : '')
    const currentHref = `${pathname}${
      searchParams.toString() ? `?${searchParams.toString()}` : ''
    }`

    if (nextHref === currentHref) return

    replace(nextHref, {
      scroll: !scroll,
    })
  }

  const allQueriesParams = String(new URLSearchParams(searchParams))

  return { replace, searchParams, allQueriesParams, changeQuery, hashParams }
}
