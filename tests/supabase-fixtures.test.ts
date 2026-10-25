// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const fixtures = [
  '20261004160001_role_security.sql',
  '20261004160002_event_validation.sql',
  '20261004160003_atomic_writes.sql',
  '20261004160004_api_keys.sql',
  '20261004160005_account_settings.sql',
].map((name) => ({
  name,
  source: readFileSync(`supabase/tests/${name}`, 'utf8'),
}))

// Source-only guards: these do not parse or execute PostgreSQL or certify RLS.
describe('supabase/tests final migration compatibility', () => {
  for (const { name, source } of fixtures) {
    it(`${name} requires the final schema and one rollback-only session`, () => {
      const guidance = source.split('BEGIN;')[0].replace(/^-- ?/gm, '')
      if (name === '20261004160005_account_settings.sql') {
        expect(guidance).toMatch(/ALL FIVE forward\s+migrations/)
        expect(guidance).toContain('20261004160005')
      } else {
        expect(guidance).toMatch(/ALL FOUR forward\s+migrations/)
        expect(guidance).toContain('20261004160004')
      }
      expect(guidance).toMatch(/finally/)
      const sql = source.replace(/--[^\n]*/g, '')
      expect(sql.match(/^BEGIN;/gm)).toHaveLength(1)
      expect(sql.match(/^ROLLBACK;/gm)).toHaveLength(1)
      expect(sql.trim()).toMatch(/ROLLBACK;$/)
      const statements = sql.replace(/'(?:''|[^'])*'/g, '')
      expect(statements).not.toMatch(/\b(?:COMMIT|TRUNCATE|setval)\b/i)
      expect(sql).not.toMatch(/\bSET ROLE\b/i)
      expect(sql).toMatch(/SET LOCAL statement_timeout = '15s'/)
      expect(sql).toMatch(/SET LOCAL lock_timeout = '3s'/)
      expect(sql).toMatch(
        /SET LOCAL idle_in_transaction_session_timeout = '30s'/,
      )
    })

    it(`${name} never writes or reads the removed table key column`, () => {
      const sql = source.replace(/--[^\n]*/g, '')
      for (const insert of sql.matchAll(
        /INSERT INTO public\.api_keys\s*\(([^)]+)\)/g,
      )) {
        const columns = insert[1].split(',').map((column) => column.trim())
        expect(columns).toEqual(
          expect.arrayContaining(['project_id', 'key_hash', 'key_prefix']),
        )
        expect(columns).not.toContain('key')
        expect(
          columns.every((column) =>
            [
              'id',
              'project_id',
              'key_hash',
              'key_prefix',
              'last_used_at',
              'revoked_at',
            ].includes(column),
          ),
        ).toBe(true)
      }
      expect(sql).not.toMatch(/\b(?:ak|api_keys)\.key\b/)
      expect(sql).not.toMatch(
        /\b(?:SELECT|PERFORM)\s+key\s+FROM\s+public\.api_keys\b/,
      )
      expect(sql).not.toMatch(/UPDATE public\.api_keys SET key\s*=/)
    })
  }

  it('20261004160001_role_security.sql checks membership only after RLS', () => {
    const migration = readFileSync(
      'supabase/migrations/20261004160001_role_security.sql',
      'utf8',
    ).replace(/--[^\n]*/g, '')
    expect(migration).toMatch(
      /CREATE TRIGGER user_roles_require_membership\s+AFTER INSERT OR UPDATE OF user_id, role_id ON public\.user_roles\s+FOR EACH ROW EXECUTE FUNCTION public\.require_user_role_membership\(\)/,
    )
  })

  it('20261004160002_event_validation.sql uses hash-only synthetic ingestion keys', () => {
    const source = fixtures[1].source
    expect(source).toContain(
      'INSERT INTO public.api_keys (id, project_id, key_hash, key_prefix)',
    )
    expect(source).toMatch(
      /encode\(extensions\.digest\(v_key, 'sha256'\), 'hex'\), left\(v_key, 8\)/,
    )
    expect(source).toContain('public.ingest_event(v_key,')
  })

  it('20261004160004_api_keys.sql checks expected failure messages, not any P0001', () => {
    const source = fixtures[3].source
    expect(source).toMatch(
      /IF SQLERRM <> \(CASE WHEN v_mode = 'fail' THEN 'fixture key insert failure'\s+ELSE 'API key creation failed' END\) THEN RAISE/,
    )
    expect(source).toMatch(/IF SQLERRM <> 'invalid_api_key' THEN RAISE/)
    expect(source).not.toMatch(/EXCEPTION WHEN raise_exception THEN NULL/)
  })

  it('20261004160004_api_keys.sql snapshots usage after SDK lookups before rotation', () => {
    const source = fixtures[3].source
    const snapshot = source.indexOf(
      'SELECT last_used_at INTO STRICT v_old_last_used',
    )
    const rotate = source.indexOf(
      'SELECT * INTO STRICT v_issued FROM public.create_api_key',
    )
    expect(snapshot).toBeGreaterThan(
      source.lastIndexOf(
        'PERFORM public.get_project_schemas_for_sdk(v_old_secret)',
        rotate,
      ),
    )
    expect(rotate).toBeGreaterThan(snapshot)
    expect(source).toContain('IS DISTINCT FROM v_old_last_used')
    expect(source).toContain('SDK lookup did not update legacy key audit')
    expect(source).not.toMatch(
      /\(SELECT last_used_at FROM public\.api_keys WHERE id = v_old_id\) <> '2026-01-01/,
    )
  })
})
