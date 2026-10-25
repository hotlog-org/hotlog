# Data Contracts & Event Ingestion

> Part 1 of 4 of the Hotlog database documentation.
> Related: [Access Control & Identity](./02-access-control-and-identity.md) ·
> [Dashboards & Visualization](./03-dashboards-and-visualization.md) ·
> [Supabase Infrastructure & Operations](./04-supabase-infrastructure-and-operations.md)

## Scope

This domain owns the **data-modelling and telemetry core** of Hotlog: the
`schemas` and `fields` tables that define the shape of customer data, the
`events` table that stores ingested telemetry, and the public RPC surface that
SDKs use to push events and introspect schemas.

The defining idea here is the **immutable contract**: once a schema or field
`key` exists, it never changes, because event payloads and generated SDK types
are validated against those keys. Renaming and deletion are handled through a
separate editable `display_name` and a `status` enum (soft delete) so that
historical events stay valid forever.

> A note on where the schema lives: the base table DDL (primary keys, `NOT
> NULL`, `DEFAULT`s, foreign keys) was applied directly on the hosted Supabase
> project, **not** through a repo migration —
> `supabase/migrations/20260314173820_remote_schema.sql` is an empty
> placeholder. The authoritative column listing is the generated
> `database.types.ts` (regenerated with `npm run supabase-types`). Repo
> migrations layer columns, constraints, indexes, RLS and functions *on top*
> of that base. Column types below are taken from `database.types.ts`;
> constraints/defaults from the migration that introduced them.

---

## Tables

### `schemas`

A schema is a named contract for one kind of event within a project.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK (`gen_random_uuid()`, base DDL) |
| `project_id` | `uuid` | FK → `projects.id` (`schemas_project_id_fkey`) |
| `key` | `text` | **Immutable** identifier, `^[a-z][a-z0-9_]*$`. Used in event ingestion + SDK types |
| `name` | `text` | Legacy raw name, kept for backward compat / SDK output |
| `display_name` | `text` | Editable human label shown in the UI |
| `status` | `schema_status` | `active` \| `archived`; default `active` |
| `created_at` | `timestamptz` | default `now()` |

Constraints & immutability added by
`20260411181128_schemas_immutable_contracts.sql`:

- `key` and `display_name` set `NOT NULL` after a backfill (`key` slugified
  from `name`, deduplicated per project with `_2`, `_3`, … suffixes).
- `UNIQUE (project_id, key)` → constraint `schemas_project_key_unique`.
- `status` is `schema_status NOT NULL DEFAULT 'active'`.

**Soft delete:** archiving sets `status = 'archived'`. The row stays so old
events still resolve their schema; ingestion only matches `status = 'active'`.

### `fields`

A field is one typed attribute of a schema.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `schema_id` | `uuid \| null` | FK → `schemas.id` (`fields_schema_id_fkey`) |
| `key` | `text` | **Immutable** identifier, used in event payload validation |
| `name` | `text` | Legacy raw name |
| `display_name` | `text` | Editable human label |
| `type` | `FieldTypes` | `STRING \| NUMBER \| BOOLEAN \| DATETIME \| ARRAY \| JSON \| ENUM` |
| `required` | `boolean` | default `false`; forced to `false` when archived |
| `status` | `field_status` | `active` \| `archived`; default `active` |
| `metadata` | `json` | **`json`, not `jsonb`** — see the cast note below |
| `created_at` | `timestamptz` | default `now()` |

Constraints from `20260411181128_schemas_immutable_contracts.sql`: `key` /
`display_name` `NOT NULL` after backfill, `UNIQUE (schema_id, key)` →
`fields_schema_key_unique`, `status field_status NOT NULL DEFAULT 'active'`,
`required boolean NOT NULL DEFAULT false`.

> **`metadata` is `json`, not `jsonb`.** This bit twice. RPCs that build a
> `jsonb` result graph must cast `f.metadata::jsonb` — fixed in
> `20260423_fix_sdk_schemas_jsonb_cast.sql` and
> `20260425_fix_get_fields_return_types.sql`. Keep the cast in any new
> field-reading function.

`metadata` carries type-specific config (description, `enumValues` for `ENUM`,
`numberRange` for `NUMBER`, `itemType` for `ARRAY`). The TypeScript mirror is
`IFieldMetadata` in `src/shared/api/interface/schema.interface.ts`.

### `events`

Append-only telemetry log.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | PK, identity |
| `project_id` | `uuid` | FK → `projects.id` (`events_project_id_fkey`) |
| `schema_id` | `uuid` | FK → `schemas.id` (`events_schema_id_fkey`), `NOT NULL` |
| `value` | `jsonb` | The event payload (keyed by field `key`) |
| `created_at` | `timestamptz` | default `now()` |

Events are written almost exclusively through the `ingest_event` RPC (below).
`value` is `jsonb` so payloads can be filtered server-side and tolerate
schema evolution.

### Enums (owned here)

```text
schema_status : 'active' | 'archived'
field_status  : 'active' | 'archived'
FieldTypes    : 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATETIME'
              | 'ARRAY'  | 'JSON'   | 'ENUM'
```

---

## Functions / RPCs

All four are `SECURITY DEFINER` except `events_daily_counts`. The three
ingestion/SDK functions authenticate by **API key hash**, not a user session —
see [API keys in the Ops doc](./04-supabase-infrastructure-and-operations.md#api_keys).

### `ingest_event(p_api_key text, p_schema_key text, p_value jsonb) → (id bigint, created_at timestamptz)`

The public write path. Defined in `20260421_event_ingestion.sql`, hardened in
`20260424_fix_ingest_event_return_types.sql`.

1. Resolve the API key by `key_hash = encode(extensions.digest(p_api_key,
   'sha256'),'hex')` and `revoked_at IS NULL`; raise `invalid_api_key`
   (`ERRCODE P0001`) if not found.
2. Resolve the schema by `(project_id, key, status='active')`; raise
   `schema_not_found` (`P0002`) if missing.
3. `INSERT INTO events …` and `RETURNING events.id::BIGINT,
   events.created_at::TIMESTAMPTZ` (explicit casts so the row shape always
   matches the declared `RETURNS TABLE`).
4. Touch `api_keys.last_used_at`.

`GRANT EXECUTE … TO anon, authenticated`.

### `get_active_fields_for_ingest(p_api_key text, p_schema_key text) → (key text, type FieldTypes, required boolean, metadata jsonb)`

Same key+schema validation, then returns the schema's `status='active'`
fields so the API route can validate payloads before calling `ingest_event`.
`metadata` is returned as `COALESCE(f.metadata::jsonb, '{}'::jsonb)` (the json→jsonb
cast fix, `20260425`). Granted to `anon, authenticated`.

### `get_project_schemas_for_sdk(p_api_key text) → jsonb`

SDK introspection (`20260422`, cast-fixed in `20260423`). Validates the API
key, then returns:

```json
{ "project": { "id": "...", "name": "..." },
  "schemas": [ { "key": "...", "name": "...", "displayName": "...",
                 "fields": [ { "key", "name", "displayName", "type",
                               "required", "metadata" } ] } ] }
```

Only `active` schemas/fields are included, ordered by key. Also touches
`last_used_at`. Granted to `anon, authenticated`. Consumed by
`src/app/(api)/api/sdk/schemas/route.ts`.

### `events_daily_counts(p_project_id uuid, p_days integer) → (day date, count bigint)`

Dashboard helper (`20260411185758_event_stats_rpc.sql`). `LANGUAGE sql
STABLE` (no `SECURITY DEFINER` — runs under the caller, so events RLS still
applies). Zero-fills the trailing `p_days` days via `generate_series` so the
caller never patches gaps. Called from
`src/app/(api)/api/project/events/stats/route.ts`.

### `get_project_id_for_schema(p_schema_id uuid) → uuid`

A `SECURITY DEFINER` helper that resolves a schema's `project_id`. It lives in
`20260404_add_rls_policies.sql` and exists so the **fields RLS policies** can
defer their project-membership/permission checks to the parent schema's
project. The policy logic is described in
[Access Control & Identity](./02-access-control-and-identity.md); the function
is listed here because it is conceptually part of the schema/field graph.

---

## Triggers

**None.** Hotlog defines **zero database triggers** anywhere. There is no
trigger maintaining `updated_at`, no `AFTER INSERT` fan-out on `events`, no
audit trigger. This is deliberate:

- Write-time invariants (valid API key, active schema, payload shape) are
  enforced inside the `SECURITY DEFINER` ingestion functions, which are the
  only sanctioned write path.
- Read-time access control is enforced by RLS policies.
- Soft delete is an explicit `status` column update from application code,
  not a trigger rewriting `DELETE` into `UPDATE`.

Keeping logic in callable functions + RLS (rather than hidden triggers) makes
the data path explicit and debuggable. If you ever need derived/denormalised
data, prefer an RPC or a scheduled job over a trigger to stay consistent with
this convention.

---

## Indexes

| Index | Table | Columns | Kind | Source |
|---|---|---|---|---|
| `idx_schemas_project_id` | `schemas` | `(project_id)` | btree | `20260404` |
| `schemas_project_status_idx` | `schemas` | `(project_id, status)` | btree | `20260411181128` |
| `schemas_project_key_unique` | `schemas` | `(project_id, key)` | unique constraint | `20260411181128` |
| `idx_fields_schema_id` | `fields` | `(schema_id)` | btree | `20260404` |
| `fields_schema_status_idx` | `fields` | `(schema_id, status)` | btree | `20260411181128` |
| `fields_schema_key_unique` | `fields` | `(schema_id, key)` | unique constraint | `20260411181128` |
| `idx_events_project_id` | `events` | `(project_id)` | btree | `20260404` |
| `events_project_schema_created_idx` | `events` | `(project_id, schema_id, created_at DESC)` | btree | `20260421` |

The `*_status_idx` pair backs the common "list active schemas/fields" query;
`events_project_schema_created_idx` backs dashboard time-series and recency
queries; the `*_key_unique` constraints are what make the immutable-key
contract enforceable.

---

## RLS policies

RLS is enabled on `schemas`, `fields`, and `events` in
`20260404_add_rls_policies.sql` (Sections I, J, K). All policies target the
`authenticated` role. Helper functions (`is_project_member`,
`has_permission`, `get_project_id_for_schema`) are documented in
[Access Control & Identity](./02-access-control-and-identity.md).

| Table | Cmd | USING / WITH CHECK |
|---|---|---|
| `schemas` | SELECT | `is_project_member(project_id)` |
| `schemas` | INSERT | `has_permission(project_id,'create','schemas')` |
| `schemas` | UPDATE | `has_permission(project_id,'update','schemas')` (both) |
| `schemas` | DELETE | `has_permission(project_id,'delete','schemas')` |
| `fields` | SELECT | `is_project_member(get_project_id_for_schema(schema_id))` |
| `fields` | INSERT | `has_permission(get_project_id_for_schema(schema_id),'create','fields')` |
| `fields` | UPDATE | `has_permission(get_project_id_for_schema(schema_id),'update','fields')` (both) |
| `fields` | DELETE | `has_permission(get_project_id_for_schema(schema_id),'delete','fields')` |
| `events` | SELECT | `is_project_member(project_id)` |
| `events` | INSERT | `has_permission(project_id,'create','events')` |
| `events` | UPDATE | `has_permission(project_id,'update','events')` (both) |
| `events` | DELETE | `has_permission(project_id,'delete','events')` |

> The ingestion RPCs are `SECURITY DEFINER` and therefore **bypass these
> policies** — that is the whole point: anonymous SDK callers have no session,
> so RLS would block them. Access is instead gated by the hashed API key
> inside the function body.

> **Operational gotcha:** an `events` `DELETE` blocked by RLS returns HTTP 200
> with zero rows, not 403. The delete route compensates with a load-bearing
> `.select('id')`; see
> [the Ops doc](./04-supabase-infrastructure-and-operations.md#rls-silent-no-ops).

---

## Inspecting the data

Run these in the Supabase SQL editor / `psql` (the `postgres` role bypasses
RLS, so you see the full project). Replace `<placeholders>`.

**1. Every schema in a project, with its active-field and event counts**

```sql
select s.key,
       s.display_name,
       s.status,
       count(distinct f.id) filter (where f.status = 'active') as active_fields,
       count(distinct e.id)                                    as events,
       max(e.created_at)                                       as last_event_at
from   schemas s
left   join fields f on f.schema_id = s.id
left   join events e on e.schema_id = s.id
where  s.project_id = '<project_id>'
group  by s.id
order  by events desc;
```

**2. The full field contract for one schema (active *and* archived)**

```sql
select f.key, f.display_name, f.type, f.required, f.status, f.metadata
from   fields f
join   schemas s on s.id = f.schema_id
where  s.project_id = '<project_id>'
  and  s.key = '<schema_key>'
order  by f.status, f.key;
```

**3. The most recent events for a project, with the schema key resolved**

```sql
select e.id, s.key as schema, e.created_at, e.value
from   events e
join   schemas s on s.id = e.schema_id
where  e.project_id = '<project_id>'
order  by e.created_at desc
limit  50;
```

**4. Daily event volume for the last 30 days (via the shipped RPC)**

```sql
select * from events_daily_counts('<project_id>'::uuid, 30);
```

**5. Events that would violate a now-required field** (the immutable-contract
audit — run before/after marking a field `required`)

```sql
select e.id, e.created_at, e.value
from   events e
join   schemas s on s.id = e.schema_id
where  s.project_id = '<project_id>'
  and  s.key = '<schema_key>'
  and  not (e.value ? '<required_field_key>')
order  by e.created_at desc;
```

---

## Migration history (this domain)

| Migration | What it did |
|---|---|
| `20260411181128_schemas_immutable_contracts.sql` | Added `key`/`display_name`/`status` to `schemas` & `fields`, `required` to `fields`, backfill + dedup, unique constraints, status indexes, the two status enums |
| `20260411185758_event_stats_rpc.sql` | `events_daily_counts` |
| `20260421_event_ingestion.sql` | `ingest_event`, `get_active_fields_for_ingest`, `events_project_schema_created_idx` (also added API-key hash columns — see Ops doc) |
| `20260422_sdk_schemas_fn.sql` | `get_project_schemas_for_sdk` |
| `20260423_fix_sdk_schemas_jsonb_cast.sql` | `metadata::jsonb` cast fix in the SDK fn |
| `20260424_fix_ingest_event_return_types.sql` | Explicit `::BIGINT` / `::TIMESTAMPTZ` casts on `ingest_event` return |
| `20260425_fix_get_fields_return_types.sql` | `key::TEXT` + `metadata::jsonb` casts on `get_active_fields_for_ingest` |
| `20260404_add_rls_policies.sql` | `schemas`/`fields`/`events` RLS + `get_project_id_for_schema` + base indexes |

## Source references

- Migrations: `supabase/migrations/2026041118112{8,…}`, `…21`, `…22`, `…23`, `…24`, `…25`, `…185758`
- Types: `database.types.ts` (`schemas`, `fields`, `events`, Enums block)
- TS interfaces: `src/shared/api/interface/schema.interface.ts`, `event.interface.ts`
- API routes: `src/app/(api)/api/events/route.ts`, `src/app/(api)/api/sdk/schemas/route.ts`, `src/app/(api)/api/project/events/stats/route.ts`
