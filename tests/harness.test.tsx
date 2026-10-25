import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { cn } from '@/shared/utils/shadcn.utils'

function HarnessButton() {
  const [count, setCount] = useState(0)

  return (
    <button className={cn('px-2', 'px-4')} onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}

describe('unit test harness', () => {
  it('resolves the app alias and renders interactive React with DOM matchers', async () => {
    const user = userEvent.setup()
    render(<HarnessButton />)

    const button = screen.getByRole('button', { name: 'Count: 0' })
    expect(button).toHaveClass('px-4')
    expect(button).not.toHaveClass('px-2')
    await user.click(button)
    expect(button).toHaveTextContent('Count: 1')
  })

  it('cleans up rendered DOM between tests', () => {
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('rejects unmocked fetches without making a network request', async () => {
    await expect(fetch('https://unit-test.invalid')).rejects.toThrow(
      'Unexpected fetch: mock the request',
    )
  })

  it('supports explicitly mocked responses without service credentials', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ok: true }))

    const response = await fetch('https://unit-test.invalid')
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('resets transport mocks between tests', async () => {
    expect(fetch).not.toHaveBeenCalled()
    await expect(fetch('https://unit-test.invalid')).rejects.toThrow(
      'Unexpected fetch: mock the request',
    )
  })
})
