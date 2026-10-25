import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const repository = fileURLToPath(new URL('../', import.meta.url))

/** @param {string[]} argv */
export function localResetCommand(argv) {
  // No user-supplied CLI flags, URL, version or target can reach Supabase.
  if (argv.length !== 1 || argv[0] !== '--confirm-local-reset') {
    throw new Error(
      'Refusing reset. Only --confirm-local-reset is accepted; this erases the isolated LOCAL database. Never reset linked Hotlog mcpsycjnnjmdobrhvstr.',
    )
  }
  return {
    executable: 'npx',
    args: [
      '--no-install',
      'supabase',
      'db',
      'reset',
      '--local',
      '--workdir',
      repository,
    ],
  }
}

/** @param {string[]} argv */
export function runLocalReset(argv) {
  const { executable, args } = localResetCommand(argv)
  const result = spawnSync(executable, args, {
    cwd: repository,
    stdio: 'inherit',
    shell: false,
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = runLocalReset(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Local reset failed')
    process.exitCode = 1
  }
}
