import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { expect, it, vi } from 'vitest'

vi.mock('./user-permission.api', () => ({
  userPermissionsQueryApi: () => new Promise(() => {}),
}))

import { useUserPermissions } from './user-permission.hook'
import { EUserPermissionKey } from '../interface'

it('never grants the old project permissions from placeholder data', () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, placeholderData: keepPreviousData },
    },
  })
  client.setQueryData([EUserPermissionKey.USER_PERMISSIONS_QUERY, 'first'], {
    data: { permissions: ['read:events'] },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result, rerender } = renderHook(
    ({ projectId }) => useUserPermissions(projectId),
    { initialProps: { projectId: 'first' }, wrapper },
  )
  expect(result.current.can('read:events')).toBe(true)
  rerender({ projectId: 'second' })
  expect(result.current.can('read:events')).toBe(false)
  expect(result.current.isPlaceholderData).toBe(true)
})
