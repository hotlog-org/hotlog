'use client'

import { useCallback, useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  hasNextPage?: boolean
  isFetching?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage: () => void
}

export const useInfiniteScroll = ({
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  fetchNextPage,
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage()
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, isFetching, fetchNextPage],
  )

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [])

  return { lastElementRef }
}
