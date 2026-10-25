// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Source-shape checks ONLY: no PostgreSQL parser, CLI, credentials or dump reads.
const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const migration = (name: string) => read(`supabase/migrations/${name}`)
const baseline = migration('20260314173820_remote_schema.sql').replace(
  /--[^\n]*/g,
  '',
)
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex')
const tables = [
  'api_keys',
  'components',
  'events',
  'fields',
  'layouts',
  'permissions',
  'projects',
  'role_permissions',
  'roles',
  'schemas',
  'user_projects',
  'user_roles',
]
const tableBody = (name: string) => {
  const match = baseline.match(
    new RegExp(`CREATE TABLE public\\.${name} \\(([\\s\\S]*?)\\n\\);`),
  )
  expect(match, name).not.toBeNull()
  return match![1]
}

// Existing immutable migration bytes at dev 0440950; baseline is the sole repair.
const historicalHashes = {
  '20260404_add_rls_policies.sql':
    '56c246deb1b240043a68a3d73bb6a0549251c842d0e1400f46ae49d6f115e205',
  '20260411181128_schemas_immutable_contracts.sql':
    '936581aa909341e42d607b388d1ed886cc0c219f883b8c1a4be767a671a90ff2',
  '20260411185758_event_stats_rpc.sql':
    '6e3448eb59ef5b42496fbe7c145749deabb8c0fef9b93dd8f0c2d3133a7ad846',
  '20260411194700_has_permission_subject_wildcard.sql':
    '43703cbaa44d7bb6e51b4a816a49b937d8c74e60ee5b99bfce7c5c90f781ea09',
  '20260412_layout_component_columns.sql':
    'bb26219a7b5ebd921705adaf9f2ccd029343986b145d4bfb490673f6c613129c',
  '20260413_component_span.sql':
    '5d71bcaa60c2a1aef43d05ed2324387b99465663a2c19b19cb37d08a3334346c',
  '20260414_role_layouts.sql':
    '6fe31d5d7fdbb361e4ed021bd5fd0070715b24b49a83c6483ef289da317e7e87',
  '20260415_fix_layouts_select_policy.sql':
    'b233f9cc6e8d218aebe9e9ddcc1f60e25ebe8eca3286c4928d8e94975aee9905',
  '20260416_fix_role_layouts_rls.sql':
    '63ba7e4d616fa4d2132ff66d41a24d525311a2b1f94a5a84de7d1ffde97979a3',
  '20260417_invitations.sql':
    '7561973f89b7e19e0fbfc416681af8932ba2d179a2388f37477d013b475175cb',
  '20260418_fix_user_projects_select.sql':
    '19d9ff0651e0b97f62704cbd8baf1f31b37cce0ecf2fb204cb90f7345a78fda5',
  '20260419_update_user_role_fn.sql':
    '8eee20fad11c2c0f92057f4fa51c2f705637592bf279979fbd985b4fa3fe76e6',
  '20260420_fix_user_roles_select.sql':
    '3a128e1af0bc51230fef3796bb9597cc8d690a7ade2f725cb1b832d637f62ee1',
  '20260421_event_ingestion.sql':
    '188610ccd2a3b83f310908fa414d454213aebe90a0a8fd617b7fcb7f43c8863e',
  '20260422_sdk_schemas_fn.sql':
    'b26200f279db8b98f63b4251bb03f566e888c0db898b8d8430da1a2c380735c0',
  '20260423_fix_sdk_schemas_jsonb_cast.sql':
    '1c9049d9140683cafd5897f5fa865088c4a38d86fa32d2e896e3387828b761ba',
  '20260424_fix_ingest_event_return_types.sql':
    '94c58e306d2ce427ab408a98a295dd874357fd2cfd9b4ad927ede9e348e456ba',
  '20260425_fix_get_fields_return_types.sql':
    'd44c72c3a1695ab03e614e24de676a857fae03db3ff720de771f5682bfbc42c9',
}

describe('Supabase prerequisite baseline (static, not clean-install proof)', () => {
  it('has only the 12 prerequisite tables and 2 original enum types', () => {
    expect(
      [...baseline.matchAll(/CREATE TABLE public\.(\w+)/g)].map((m) => m[1]),
    ).toEqual(tables)
    expect(
      [...baseline.matchAll(/CREATE TYPE public\."(\w+)"/g)].map((m) => m[1]),
    ).toEqual(['ComponentTypes', 'FieldTypes'])
    expect(baseline).toMatch(
      /'STRING',[\s\S]*'NUMBER',[\s\S]*'BOOLEAN',[\s\S]*'DATETIME',[\s\S]*'ARRAY',[\s\S]*'JSON',[\s\S]*'ENUM'/,
    )
    expect(baseline).not.toMatch(
      /CREATE (?:OR REPLACE )?FUNCTION|CREATE POLICY|CREATE INDEX|INSERT INTO/,
    )
  })

  it.each(tables)(
    'keeps %s RLS-enabled and with its recovered primary key',
    (name) => {
      expect(baseline).toContain(
        `ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY;`,
      )
      const primaryKey =
        name === 'components' ? 'componen_pkey' : `${name}_pkey`
      expect(baseline).toContain(`ADD CONSTRAINT ${primaryKey} PRIMARY KEY`)
    },
  )

  it('preserves original payload types, nullable field parent and composite keys', () => {
    expect(tableBody('events')).toContain('value json NOT NULL')
    expect(tableBody('fields')).toMatch(
      /metadata json DEFAULT '\{\}'::json NOT NULL/,
    )
    expect(tableBody('fields')).toMatch(/schema_id uuid,/)
    expect(tableBody('components')).toContain('index smallint NOT NULL')
    expect(tableBody('components')).toContain('inputs_ids json NOT NULL')
    expect(tableBody('components')).toContain(
      'type public."ComponentTypes" NOT NULL',
    )
    expect(baseline).toContain(
      'role_permissions_pkey PRIMARY KEY (id, role_id, permission_id)',
    )
    expect(baseline).toContain(
      'user_roles_pkey PRIMARY KEY (id, user_id, role_id)',
    )
    expect(baseline).not.toMatch(
      /UNIQUE \(user_id, project_id\)|UNIQUE \(user_id, role_id\)/,
    )
    expect(baseline).toContain(
      'permissions_action_subject_unique UNIQUE (action, subject)',
    )
  })

  it.each(['api_keys', 'events', 'layouts'])(
    'keeps %s BY DEFAULT identity',
    (name) => {
      expect(baseline).toContain(
        `ALTER TABLE public.${name} ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY`,
      )
      expect(baseline).toContain(`SEQUENCE NAME public.${name}_id_seq`)
    },
  )

  it('retains all 14 recoverable original foreign keys with exact cascade actions', () => {
    const foreignKeys = [
      ...baseline.matchAll(
        /ADD CONSTRAINT (\w+) FOREIGN KEY \((\w+)\) REFERENCES (public|auth)\.(\w+)\(id\) ON UPDATE CASCADE ON DELETE CASCADE;/g,
      ),
    ].map((m) => `${m[1]}:${m[2]}:${m[3]}.${m[4]}`)
    expect(foreignKeys).toEqual([
      'api_keys_project_id_fkey:project_id:public.projects',
      'events_project_id_fkey:project_id:public.projects',
      'events_schema_id_fkey:schema_id:public.schemas',
      'fields_schema_id_fkey:schema_id:public.schemas',
      'layouts_project_id_fkey:project_id:public.projects',
      'projects_creator_id_fkey:creator_id:auth.users',
      'role_permissions_permission_id_fkey:permission_id:public.permissions',
      'role_permissions_role_id_fkey:role_id:public.roles',
      'roles_project_id_fkey:project_id:public.projects',
      'schemas_project_id_fkey:project_id:public.projects',
      'user_projects_project_id_fkey:project_id:public.projects',
      'user_projects_user_id_fkey:user_id:auth.users',
      'user_roles_role_id_fkey:role_id:public.roles',
      'user_roles_user_id_fkey:user_id:auth.users',
    ])
  })

  it('leaves later columns and constraints to their historical owners', () => {
    for (const name of ['schemas', 'fields']) {
      expect(tableBody(name)).toContain('name text NOT NULL')
      expect(tableBody(name)).not.toMatch(
        /\b(key|display_name|status|required)\b/,
      )
    }
    expect(tableBody('layouts')).not.toMatch(/\bcolor\b/)
    expect(tableBody('components')).not.toMatch(
      /\b(visualization|schema_id|span|DEFAULT 'TIME_SERIES')\b/,
    )
    expect(tableBody('api_keys')).toContain(
      'key uuid DEFAULT gen_random_uuid() NOT NULL',
    )
    expect(tableBody('api_keys')).not.toMatch(
      /key_hash|key_prefix|last_used_at|revoked_at/,
    )
    expect(baseline).not.toMatch(
      /schema_status|field_status|schemas_project_key_unique|fields_schema_key_unique/,
    )
    const april12 = migration('20260412_layout_component_columns.sql')
    expect(baseline).not.toContain('ADD CONSTRAINT componen_layout_id_fkey')
    expect(april12).toMatch(
      /ADD CONSTRAINT componen_layout_id_fkey\s+FOREIGN KEY \(layout_id\) REFERENCES public.layouts\(id\) ON DELETE CASCADE/,
    )
    expect(migration('20260421_event_ingestion.sql')).toContain(
      'CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions',
    )
  })

  it('guards existing Hotlog objects before any prerequisite DDL', () => {
    expect(baseline.indexOf('RAISE EXCEPTION')).toBeLessThan(
      baseline.indexOf('CREATE TYPE'),
    )
    expect(baseline).toMatch(/USING ERRCODE = '55000'/)
    for (const name of [...tables, 'role_layouts', 'invitations']) {
      expect(baseline.slice(0, baseline.indexOf('CREATE TYPE'))).toContain(
        `'${name}'`,
      )
    }
  })

  it('supplies schema, sequence and later-table privileges; key hardening remains forward-only', () => {
    expect(baseline).toContain(
      'GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role',
    )
    expect(baseline).toContain(
      'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role',
    )
    expect(baseline).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role/,
    )
    expect(baseline).toContain(
      'REVOKE ALL ON TABLE public.components FROM anon, service_role',
    )
    expect(migration('20261004160004_api_keys.sql')).toContain(
      'DROP COLUMN key',
    )
  })

  it.each(Object.entries(historicalHashes))(
    'preserves historical migration %s',
    (name, hash) => {
      expect(digest(migration(name))).toBe(hash)
    },
  )

  it('retains the ordered forward stages after the historic chain', () => {
    const names = readdirSync(
      new URL('../supabase/migrations/', import.meta.url),
    )
      .filter((name) => name.endsWith('.sql'))
      .sort()
    expect(names).toEqual([
      '20260314173820_remote_schema.sql',
      ...Object.keys(historicalHashes),
      '20261004160001_role_security.sql',
      '20261004160002_event_validation.sql',
      '20261004160003_atomic_writes.sql',
      '20261004160004_api_keys.sql',
      '20261004160005_account_settings.sql',
    ])
  })
})

describe('Supabase static permission seed and local setup', () => {
  it('matches all 43 approved catalog IDs and exact action/subject combinations', () => {
    const seed = read('supabase/seed.sql')
    const rows = [
      ...seed.matchAll(/\('([a-f0-9-]+)', '([^']+)', '([^']+)'\)/g),
    ].map((m) => m.slice(1))
    expect(rows).toHaveLength(43)
    expect(new Set(rows.map(([id]) => id)).size).toBe(43)
    expect(
      new Set(rows.map(([, action, subject]) => `${action}:${subject}`)).size,
    ).toBe(43)
    // Fingerprint of approved catalog rows sorted by action/subject/id, not dump data.
    expect(digest(rows.map((row) => row.join(':')).join('\n'))).toBe(
      'c5be912ae5e024f41236abc427bcc4dbec2774b4d1a2fb41b9b08dfb1ddc9fe5',
    )
    expect(seed.replace(/--[^\n]*/g, '')).toMatch(
      /^\s*INSERT INTO public\.permissions \(id, action, subject\) VALUES[\s\S]+;\s*$/,
    )
    expect(seed).not.toMatch(/ON CONFLICT|UPDATE public|DELETE FROM/)
  })

  it('enables the static seed on a non-hosted local identifier with PG17', () => {
    const config = read('supabase/config.toml').replace(/#[^\n]*/g, '')
    expect(config).toContain('project_id = "hotlog-local"')
    expect(config).not.toContain('mcpsycjnnjmdobrhvstr')
    expect(config).toContain('major_version = 17')
    expect(config).toMatch(
      /\[db.seed\]\s+enabled = true\s+sql_paths = \["\.\/seed.sql"\]/,
    )
    expect(config).toContain('site_url = "http://localhost:3001"')
    for (const locale of ['en', 'ru', 'am']) {
      expect(config).toContain(
        `http://localhost:3001/${locale}/auth/callback?recovery=1`,
      )
    }
  })

  it('documents linked-reset prohibition and unavailable clean-install certification', () => {
    const readme = read('README.md')
    expect(readme).toContain('Never reset linked Hotlog `mcpsycjnnjmdobrhvstr`')
    expect(readme).toContain('Clean-install certification is pending')
    expect(readme).toContain(
      'node scripts/reset-local-supabase.mjs --confirm-local-reset',
    )
    expect(readme).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  })
})
