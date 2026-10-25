# Supabase Infrastructure & Operations

> Part 4 of 4 of the Hotlog database documentation.
> Related: [Data Contracts & Event Ingestion](./01-data-contracts-and-events.md) ·
> [Access Control & Identity](./02-access-control-and-identity.md) ·
> [Dashboards & Visualization](./03-dashboards-and-visualization.md)

## Scope

The other three documents cover the application schema table-by-table. This
one steps back and covers **the platform and how we operate on it**: what
Supabase is and which of its managed capabilities Hotlog relies on
(backups, point-in-time recovery, replication/branching), how the database is
provisioned and connected to from the app, how database types and migrations
flow, the security model for the public ingestion surface (the `api_keys`
table + key hashing), and the one operational footgun every engineer must
know — RLS silent no-ops.

It owns exactly one table — `api_keys` — and intentionally keeps per-table
detail light, deferring the rest to docs 1–3.

---

## What Supabase is (and what we use)

Supabase is a managed Postgres platform. A single hosted Postgres database
sits at the centre; around it Supabase layers:

- **PostgREST** — auto-generated REST API over the `public` schema. This is
  what `@supabase/supabase-js` talks to. `database.types.ts` reports
  `PostgrestVersion: "14.4"`.
- **GoTrue (Auth)** — issues JWTs, owns the `auth` schema (`auth.users`,
  `auth.uid()`). Hotlog's entire identity model references `auth.users`; see
  [Access Control & Identity](./02-access-control-and-identity.md).
- **Row Level Security** — plain Postgres RLS is *the* authorization
  boundary. PostgREST runs queries as the `authenticated`/`anon` role, so RLS
  policies (docs 1–3) are what actually enforce access.
- **Connection pooling**, realtime, storage, edge functions — available but
  **not used** by Hotlog (no `supabase/functions/`, no storage buckets, no
  realtime subscriptions in the codebase).

### Project provisioning

| Item | Value | Source |
|---|---|---|
| Project ref | `mcpsycjnnjmdobrhvstr` | `supabase/.temp/linked-project.json`, `package.json` |
| Project name | `hotlog` | `supabase/.temp/linked-project.json` |
| Organization | `pvkblusknaqdxymmuehy` | `supabase/.temp/linked-project.json` |
| Postgres / PostgREST | reported as `14.4` | `database.types.ts`, `supabase/.temp/postgres-version` |

> **There is no `supabase/config.toml`.** The project is **dashboard-managed**,
> not declaratively configured in the repo. Auth providers, network
> restrictions, the backup/PITR plan, compute size and any read replicas are
> all configured in the Supabase dashboard for project `mcpsycjnnjmdobrhvstr`
> and are *not* reproducible from this repository. The `supabase/.temp/`
> directory only holds CLI link metadata (versions, pooler URL) and is not
> configuration.

---

## Backups, point-in-time recovery & replication

These are **Supabase-managed platform capabilities**, configured in the
dashboard (Project → Database / Infrastructure), not in code. They are
described here so operators know what is available and what to verify —
**actual enablement must be checked in the dashboard**, since this repo
contains no infrastructure config.

- **Daily backups.** Supabase takes automated daily logical backups of the
  whole database on all paid tiers (retention depends on the plan; free-tier
  projects have limited/no retained backups). Every table in docs 1–3 — and
  the `events` log in particular, which is the only high-volume,
  append-only table — is covered by these whole-database backups; there is no
  separate per-table backup job, and Hotlog does not ship its own `pg_dump`
  cron.
- **Point-in-time recovery (PITR).** An optional paid add-on. When enabled,
  Supabase ships WAL continuously and lets you restore to any second within
  the retention window. This is the relevant recovery tool for the
  append-only `events` table, where a bad bulk `DELETE` (see the RLS caveat
  below) or a faulty ingestion deploy could otherwise lose telemetry between
  daily snapshots. **Verify PITR is enabled for `mcpsycjnnjmdobrhvstr`** if
  the recovery objective is tighter than 24h.
- **Read replicas.** Supabase offers managed read replicas (and a
  geo-routing read-only endpoint) on higher tiers. Hotlog does **not** use
  one: the app instantiates a single client against the primary
  `NEXT_PUBLIC_SUPABASE_URL` (see below), there is no replica connection
  string anywhere in the codebase, and the heavy read paths
  (`events_daily_counts`, dashboard queries) currently hit the primary. If
  read load on `events` grows, a replica is the first lever — application
  code would need an explicit replica client; nothing reads from one today.
- **Streaming/physical replication.** Managed entirely by Supabase for HA
  within the project's region; not something Hotlog configures or observes.
- **Database branching.** Supabase can spin up ephemeral branch databases
  from migrations for preview environments. Hotlog *could* use it (it has a
  `supabase/migrations/` directory), but note the caveat in the next section:
  the base schema is **not** in migrations, so a clean branch would be missing
  the core tables. Branching is therefore not currently viable without first
  capturing the base schema.

> Net: backup/restore is delegated wholesale to Supabase. The single most
> important operational ask is confirming PITR retention is adequate for
> `events`, because that table is append-only telemetry with no other copy.

---

## The schema-source caveat (read this)

`supabase/migrations/20260314173820_remote_schema.sql` is **0 bytes**. The
base DDL for the core tables (`projects`, `schemas`, `fields`, `events`,
`layouts`, `components`, the join tables, their primary keys, `NOT NULL`s,
defaults and original foreign keys) was applied **directly to the hosted
database**, not through a tracked migration. The repo's migrations only layer
*additions* on top: RLS, functions, extra columns, indexes, the
`role_layouts`/`invitations` tables.

Consequences:

- The authoritative description of base columns/types is the **generated**
  `database.types.ts`, regenerated with:
  `npx supabase gen types typescript --project-id mcpsycjnnjmdobrhvstr --schema public > database.types.ts`
  (npm script `supabase-types`). Generated types do *not* expose PK columns,
  defaults or `NOT NULL` precisely — docs 1–3 infer those from the migration
  that introduced the column where possible.
- A from-scratch DB rebuild (fresh branch, local Supabase, DR into an empty
  project) from `supabase/migrations/` alone **will not produce a working
  schema** — the base tables would be missing. To make the migration set
  self-contained, dump the remote base schema (`supabase db dump`) into the
  empty `20260314173820_remote_schema.sql` placeholder. This is the top
  infrastructure risk in the project.

---

## Connecting from the app

Dependencies: `@supabase/ssr ^0.9.0`, `@supabase/supabase-js ^2.99.1`. Three
clients, all using the **publishable (anon) key** — there is **no
service-role client anywhere**. Privileged operations are done with
`SECURITY DEFINER` SQL functions instead (see docs 1–2), which is why no
service key is shipped to the app.

| File | Client | Role |
|---|---|---|
| `src/lib/supabase/server.ts` | `createServerClient` (cookie-bound) | Server Components & API routes; maintains the user session via the Next cookie store |
| `src/lib/supabase/client.ts` | `createBrowserClient` | Browser-side queries/auth |
| `src/lib/supabase/proxy.ts` | `createServerClient` in middleware | `updateSession()` calls `supabase.auth.getUser()` on each request to refresh the JWT |

Both server-side clients read `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Because every client authenticates as
`authenticated`/`anon`, **RLS is the only thing standing between a user and
another tenant's data** — there is no privileged bypass path in the
application tier.

---

## `api_keys` — the public ingestion credential

The only table this document owns. It is the credential for the anonymous SDK
surface (`ingest_event`, `get_active_fields_for_ingest`,
`get_project_schemas_for_sdk` — all in
[Data Contracts & Event Ingestion](./01-data-contracts-and-events.md)).

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | PK, identity |
| `project_id` | `uuid` | FK → `projects.id` (`api_keys_project_id_fkey`) |
| `key` | `text` | Raw key (legacy / creation-time display) |
| `key_hash` | `text \| null` | `sha256(key)` hex — the lookup column (`20260421`) |
| `key_prefix` | `text \| null` | First 8 chars, for UI identification (`20260421`) |
| `last_used_at` | `timestamptz \| null` | Touched by every successful RPC call (`20260421`) |
| `revoked_at` | `timestamptz \| null` | Non-null ⇒ key rejected (soft revoke) |

> Per `database.types.ts`, `api_keys` has **no `created_at` column**.

**Key hashing & lookup** (`20260421_event_ingestion.sql`):

- `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;` — this is
  the only non-default extension Hotlog requires.
- Existing rows were backfilled:
  `key_hash = encode(extensions.digest(key,'sha256'),'hex')`,
  `key_prefix = left(key,8)`.
- `CREATE UNIQUE INDEX api_keys_key_hash_idx ON api_keys (key_hash)` — every
  ingestion RPC resolves the caller by hashing the presented key and matching
  `key_hash` where `revoked_at IS NULL`. The raw key is never compared.

**Indexes:** `idx_api_keys_project_id` (`20260404`), `api_keys_key_hash_idx`
(unique, `20260421`).

**RLS** (`20260404`, Section N) — unusually, **even SELECT is
permission-gated** (most tables allow members to read):

| Cmd | Predicate |
|---|---|
| SELECT | `has_permission(project_id,'read','api_keys')` |
| INSERT | `has_permission(project_id,'create','api_keys')` |
| UPDATE | `has_permission(project_id,'update','api_keys')` (both) |
| DELETE | `has_permission(project_id,'delete','api_keys')` |

The ingestion RPCs are `SECURITY DEFINER` and bypass this RLS by design — an
anonymous SDK has no session, so the hashed key *is* the authentication.

---

## Triggers

**None — anywhere in the database.** Hotlog has zero triggers on any of its
14 tables. This is a deliberate, project-wide convention shared by all four
documents:

- Write invariants live in callable `SECURITY DEFINER` functions
  (`ingest_event`, `accept_invitation`, `update_user_role`).
- Access control lives in RLS policies.
- Cascade cleanup lives in `ON DELETE CASCADE` / `SET NULL` foreign keys.
- Soft delete is an explicit `status` column write from app code.

Nothing is hidden behind `BEFORE`/`AFTER` triggers, so the data path is always
visible in either a function body or a policy. New work should preserve this:
reach for an RPC or an `ON DELETE` action before a trigger.

---

## RLS silent no-ops {#rls-silent-no-ops}

**The single most important operational gotcha.** When PostgREST performs a
`DELETE` or `UPDATE` that RLS blocks, it does **not** return 403 — it returns
**HTTP 200 with zero affected rows**, indistinguishable from "your filter
matched nothing." A naive handler reports phantom success.

Two-part mitigation, both required:

1. **Server route** —
   `src/app/(api)/api/project/events/route.ts` (`DELETE`): the trailing
   `.select('id')` on the delete is *load-bearing*. PostgREST returns the rows
   actually deleted (those that survived RLS), so the route can compare
   counts:

   - `deleted === 0` → respond **403** ("missing `delete:events`… or already
     gone");
   - `deleted < ids.length` → respond **207** (partial — some blocked by RLS
     or already removed);
   - else `{ deleted }`.

   (`MAX_DELETE_BATCH = 500` caps a request.)

2. **Client** — `src/shared/api/event/event.api.ts` (`deleteEventsApi`): the
   shared `restApiFetcher` is configured with `throwHttpErrors: false`, so
   non-2xx responses must be manually re-thrown (`if (!response.ok) throw new
   Error(...)`), otherwise the mutation's `onError` never fires and the UI
   shows a phantom success.

> Rule of thumb for any new mutation: chain `.select('id')` (or another
> column) on every RLS-protected `UPDATE`/`DELETE`, check the returned row
> count, and translate "zero rows" into an explicit error. Don't trust the
> 200. This is also recorded as a project-wide memory.

---

## Inspecting the data

Run in the Supabase SQL editor / `psql` (the `postgres` role bypasses RLS).
Replace `<placeholders>`. **Never select `key` or `key_hash` from
`api_keys`** — the raw key is unrecoverable by design and the hash is the
credential.

**1. API-key inventory for a project (safe columns only)**

```sql
select id,
       key_prefix,
       last_used_at,
       revoked_at,
       (revoked_at is not null) as revoked
from   api_keys
where  project_id = '<project_id>'
order  by last_used_at desc nulls last;
```

**2. Stale / never-used keys — rotation candidates**

```sql
select id, key_prefix, last_used_at
from   api_keys
where  project_id = '<project_id>'
  and  revoked_at is null
  and  (last_used_at is null or last_used_at < now() - interval '90 days')
order  by last_used_at nulls first;
```

**3. Operational audit — RLS status & policy count for every public table**

```sql
select c.relname              as table,
       c.relrowsecurity       as rls_enabled,
       count(pol.polname)     as policies
from   pg_class c
join   pg_namespace n  on n.oid = c.relnamespace
left   join pg_policy pol on pol.polrelid = c.oid
where  n.nspname = 'public' and c.relkind = 'r'
group  by c.relname, c.relrowsecurity
order  by c.relname;
```

**4. Diagnose an RLS silent no-op** — does this user *actually* hold the
permission a 200/zero-rows response is hiding? (mirrors `has_permission`)

```sql
select exists (
  select 1
  from   user_roles ur
  join   roles r             on r.id = ur.role_id
  join   role_permissions rp on rp.role_id = r.id
  join   permissions p       on p.id = rp.permission_id
  where  ur.user_id   = '<user_id>'
    and  r.project_id = '<project_id>'
    and  p.action     = 'delete'
    and  (p.subject = 'events' or p.subject = 'all')
) as can_delete_events;
```

**5. Confirm the only required extension is installed**

```sql
select extname, extversion from pg_extension where extname = 'pgcrypto';
```

---

## Operational runbook (quick reference)

| Task | How |
|---|---|
| Regenerate DB types after a schema change | `npm run supabase-types` (writes `database.types.ts`) |
| Apply a new migration | Add a timestamped file to `supabase/migrations/`; migrations are written **idempotently** (e.g. `IF NOT EXISTS`, `DROP POLICY IF EXISTS`) so they are safe to re-run |
| Add a privileged operation | Write a `SECURITY DEFINER` SQL function with explicit permission checks + `GRANT EXECUTE` — do **not** add a service-role client |
| Recover lost `events` data | Supabase dashboard → restore from daily backup or PITR (verify PITR is enabled first) |
| Investigate "delete did nothing" | Almost always an RLS silent no-op — check the user's permissions and the `.select('id')` count, not the HTTP status |
| Rebuild DB from scratch | **Currently not possible from `supabase/migrations/` alone** — base schema is remote-only; capture it into `20260314173820_remote_schema.sql` first |

## Source references

- Provisioning: `supabase/.temp/linked-project.json`, `supabase/.temp/*`, `package.json` (`supabase-types` script, `@supabase/*` deps)
- Clients: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/proxy.ts`
- `api_keys` + hashing: `supabase/migrations/20260421_event_ingestion.sql`, `20260404_add_rls_policies.sql` (Section N), `database.types.ts`
- RLS silent no-op: `src/app/(api)/api/project/events/route.ts`, `src/shared/api/event/event.api.ts`
- Schema-source caveat: `supabase/migrations/20260314173820_remote_schema.sql` (empty)
