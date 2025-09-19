'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { localizeHref } from '../utils/localize-href.utils'

export const useQuerySearchParams = () => {
  const { push } = useRouter()

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
    push(localizeHref(pathname + (queryString ? '?' + queryString : '')), {
      scroll: !scroll,
    })
  }

  const allQueriesParams = String(new URLSearchParams(searchParams))

  return { push, searchParams, allQueriesParams, changeQuery, hashParams }
}
