import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

function blockUnexpectedFetch() {
  // Tests must explicitly mock transport; never fall through to a real service.
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.reject(new Error('Unexpected fetch: mock the request')),
    ),
  )
}

// Protect module initialization as well as test bodies and teardown hooks.
blockUnexpectedFetch()
beforeEach(blockUnexpectedFetch)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  blockUnexpectedFetch()
})
