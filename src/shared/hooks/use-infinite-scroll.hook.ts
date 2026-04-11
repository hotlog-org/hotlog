'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  hasNextPage?: boolean
  isFetching?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage: () => void
  // Optional scroll-root element. When the sentinel lives inside a
  // contained scroll area (not the window), pass the container ref so
  // the IntersectionObserver fires relative to it instead of the viewport.
  rootRef?: RefObject<HTMLElement | null>
  rootMargin?: string
}

export const useInfiniteScroll = ({
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  fetchNextPage,
  rootRef,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetching) {
            fetchNextPage()
          }
        },
        {
          root: rootRef?.current ?? null,
          rootMargin,
        },
      )

      if (node) observerRef.current.observe(node)
    },
    [
      isFetchingNextPage,
      hasNextPage,
      isFetching,
      fetchNextPage,
      rootRef,
      rootMargin,
    ],
  )

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [])

  return { lastElementRef }
}
