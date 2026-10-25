// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import {
  localResetCommand,
  runLocalReset,
} from '../scripts/reset-local-supabase.mjs'

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

const repository = fileURLToPath(new URL('../', import.meta.url))

describe('reset-local-supabase guard (no database subprocesses)', () => {
  it.each([
    [],
    ['--linked'],
    ['--db-url', 'postgresql://unit-test.invalid/database'],
    ['--project-ref', 'mcpsycjnnjmdobrhvstr'],
    ['--confirm-local-reset', '--linked'],
    ['--confirm-local-reset', '--local'],
    [
      '--confirm-local-reset',
      '--db-url=postgresql://unit-test.invalid/database',
    ],
    ['--confirm-local-reset', '--workdir', '/tmp'],
    ['--confirm-local-reset', '--version', '20260314173820'],
    ['--confirm-local-reset', '--no-seed'],
    ['--confirm-local-reset', '--confirm-local-reset'],
  ])('rejects unsafe/unconfirmed argv %j without invoking CLI', (...argv) => {
    expect(() => runLocalReset(argv)).toThrow('Refusing reset')
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('pins the full local replay, workdir, no downloads and no shell', () => {
    vi.mocked(spawnSync).mockReturnValueOnce({ status: 0 } as ReturnType<
      typeof spawnSync
    >)
    expect(runLocalReset(['--confirm-local-reset'])).toBe(0)
    expect(spawnSync).toHaveBeenCalledExactlyOnceWith(
      'npx',
      [
        '--no-install',
        'supabase',
        'db',
        'reset',
        '--local',
        '--workdir',
        repository,
      ],
      { cwd: repository, stdio: 'inherit', shell: false },
    )
    expect(localResetCommand(['--confirm-local-reset']).args).not.toContain(
      '--linked',
    )
  })

  it('propagates CLI failure rather than claiming certification', () => {
    vi.mocked(spawnSync).mockReturnValueOnce({ status: 7 } as ReturnType<
      typeof spawnSync
    >)
    expect(runLocalReset(['--confirm-local-reset'])).toBe(7)
  })

  it('treats a killed process as failure', () => {
    vi.mocked(spawnSync).mockReturnValueOnce({ status: null } as ReturnType<
      typeof spawnSync
    >)
    expect(runLocalReset(['--confirm-local-reset'])).toBe(1)
  })

  it('propagates a missing CLI executable', () => {
    vi.mocked(spawnSync).mockReturnValueOnce({
      error: new Error('synthetic spawn failure'),
    } as ReturnType<typeof spawnSync>)
    expect(() => runLocalReset(['--confirm-local-reset'])).toThrow(
      'synthetic spawn failure',
    )
  })
})
