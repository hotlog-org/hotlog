# genesis.md — Hotlog database, complete reference

Single source-of-truth context file. Tables, functions, triggers, indexes,
RLS for the entire Hotlog database. Terse and exhaustive; intended as input
context for generating further documentation.

## Source of truth & ground facts

- Supabase-hosted Postgres. Project ref `mcpsycjnnjmdobrhvstr`, org
  `pvkblusknaqdxymmuehy`. Postgres/PostgREST reported `14.4`.
- Base table DDL (PKs, NOT NULL, defaults, original FKs) was applied
  **directly on the remote DB**; `supabase/migrations/20260314173820_remote_schema.sql`
  is **empty (0 bytes)**. Authoritative column listing = generated
  `database.types.ts` (regen: `npm run supabase-types`). Constraints/defaults
  below are attributed to the migration that introduced them; where only the
  generated types prove a property it is marked *(from types)*.
- No `supabase/config.toml` (dashboard-managed). No edge functions, no storage
  buckets, no realtime usage.
- One non-default extension: `pgcrypto` in schema `extensions` (migration
  `20260421`), used as `extensions.digest(<text>, 'sha256')`.
- App connects only with the publishable/anon key (3 clients:
  `src/lib/supabase/{server,client,proxy}.ts`); **no service-role client** —
  privilege escalation is done via `SECURITY DEFINER` functions.
- 14 tables, 14 catalog functions, **0 triggers**, 4 enums.

## Enums

| Enum | Values |
|---|---|
| `schema_status` | `active`, `archived` |
| `field_status` | `active`, `archived` |
| `FieldTypes` | `STRING`, `NUMBER`, `BOOLEAN`, `DATETIME`, `ARRAY`, `JSON`, `ENUM` |
| `ComponentTypes` | `TIME_SERIES` (legacy single value) |

---

## TABLES (14)

Notation: PK = primary key; FK→ = foreign key; `?` = nullable. All `id uuid`
PKs default `gen_random_uuid()`; all `id` integer PKs are identity/bigint.
`created_at` is `timestamptz DEFAULT now()` unless noted.

### projects
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | Insert-optional ⇒ has default *(from types)* |
| creator_id | uuid | NOT NULL; owning user = `auth.users.id` (no public FK row, used as `creator_id = auth.uid()`) |
| created_at | timestamptz | default now() |

FKs in: none. The tenant root.

### user_projects (membership: user ↔ project)
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK (surrogate) |
| user_id | uuid | NOT NULL = `auth.users.id` |
| project_id | uuid | NOT NULL, FK→ `projects.id` (`user_projects_project_id_fkey`) |

Surrogate-`id` join table (NOT composite PK). Uniqueness enforced by
convention/RLS, not a visible constraint.

### roles
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | NOT NULL, FK→ `projects.id` (`roles_project_id_fkey`) |
| name | text | NOT NULL |
| created_at | timestamptz | default now() |

### user_roles (assignment: user ↔ role)
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK (surrogate) |
| user_id | uuid | NOT NULL = `auth.users.id` |
| role_id | uuid | NOT NULL, FK→ `roles.id` (`user_roles_role_id_fkey`) |

### permissions (static catalogue of `action:subject`)
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK |
| action | text | NOT NULL (e.g. `create`,`read`,`update`,`delete`) |
| subject | text | NOT NULL (e.g. `schemas`,`fields`,`events`,`layouts`,`components`,`roles`,`users`,`api_keys`,`projects`; `all` = wildcard) |

No FKs. Read-only catalogue (only `GRANT SELECT`, only a SELECT policy).

### role_permissions (grant: role ↔ permission)
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK (surrogate) |
| role_id | uuid | NOT NULL, FK→ `roles.id` (`role_permissions_role_id_fkey`) |
| permission_id | uuid | NOT NULL, FK→ `permissions.id` (`role_permissions_permission_id_fkey`) |

### schemas
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | NOT NULL, FK→ `projects.id` (`schemas_project_id_fkey`) |
| key | text | NOT NULL; **immutable**; slug `^[a-z][a-z0-9_]*$`; added+backfilled then `SET NOT NULL` in `20260411181128` |
| name | text | NOT NULL; legacy raw name (base) |
| display_name | text | NOT NULL; editable label (`20260411181128`) |
| status | schema_status | NOT NULL DEFAULT `active` (`20260411181128`); soft delete |
| created_at | timestamptz | default now() |

Constraint: `schemas_project_key_unique UNIQUE (project_id, key)`
(`20260411181128`).

### fields
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK |
| schema_id | uuid? | FK→ `schemas.id` (`fields_schema_id_fkey`) |
| key | text | NOT NULL; **immutable**; backfilled+`SET NOT NULL` `20260411181128` |
| name | text | NOT NULL; legacy raw name (base) |
| display_name | text | NOT NULL (`20260411181128`) |
| type | FieldTypes | NOT NULL |
| required | boolean | NOT NULL DEFAULT false (`20260411181128`); forced false when archived (app-side) |
| status | field_status | NOT NULL DEFAULT `active` (`20260411181128`) |
| metadata | **json** | **`json`, NOT `jsonb`**; Insert-optional/defaulted; functions defensively `COALESCE(metadata::jsonb,'{}')` (`20260423`,`20260425`). Holds `description`, `enumValues` (ENUM), `numberRange` (NUMBER), `itemType` (ARRAY) |
| created_at | timestamptz | default now() |

Constraint: `fields_schema_key_unique UNIQUE (schema_id, key)`
(`20260411181128`).

### events (append-only telemetry)
| Col | Type | Notes |
|---|---|---|
| id | bigint | PK (identity) |
| project_id | uuid | NOT NULL, FK→ `projects.id` (`events_project_id_fkey`) |
| schema_id | uuid | NOT NULL, FK→ `schemas.id` (`events_schema_id_fkey`) |
| value | jsonb | NOT NULL; payload keyed by field `key` |
| created_at | timestamptz | default now() |

### layouts (dashboard)
| Col | Type | Notes |
|---|---|---|
| id | bigint | PK (identity) |
| project_id | uuid | NOT NULL, FK→ `projects.id` (`layouts_project_id_fkey`) |
| name | text | NOT NULL |
| description | text | Insert-optional ⇒ default |
| color | text | NOT NULL DEFAULT `#3b82f6` (`20260412`) |
| created_at | timestamptz | default now() |

### components (visualization inside a layout)
| Col | Type | Notes |
|---|---|---|
| id | uuid | PK |
| layout_id | bigint | NOT NULL, FK→ `layouts.id` **ON DELETE CASCADE** (`componen_layout_id_fkey`, re-created in `20260412`) |
| schema_id | uuid? | FK→ `schemas.id` **ON DELETE SET NULL** (`20260412`) |
| type | ComponentTypes | NOT NULL DEFAULT `TIME_SERIES` (default added `20260412`); legacy, superseded by `visualization` |
| visualization | text | NOT NULL DEFAULT `line` (`20260412`); actual chart type |
| span | text | NOT NULL DEFAULT `full` (`20260413`); `full`=stacked, `half`=side-by-side |
| name | text | NOT NULL *(from types)* |
| description | text | NOT NULL *(from types)* |
| index | integer | NOT NULL; display order in layout |
| inputs_ids | json | NOT NULL; component-input → schema-field-key bindings |
| created_at | timestamptz | default now() |

### api_keys (public ingestion credential)
| Col | Type | Notes |
|---|---|---|
| id | bigint | PK (identity) |
| project_id | uuid | NOT NULL, FK→ `projects.id` (`api_keys_project_id_fkey`) |
| key | text | NOT NULL; raw key (creation-time/legacy) |
| key_hash | text? | `sha256(key)` hex; lookup column; UNIQUE index (`20260421`) |
| key_prefix | text? | first 8 chars (UI id) (`20260421`) |
| last_used_at | timestamptz? | touched by every successful ingest/SDK RPC (`20260421`) |
| revoked_at | timestamptz? | non-null ⇒ rejected (soft revoke) (`20260421`) |

**No `created_at` column** *(from types)*.

### role_layouts (restrict layout visibility by role) — full DDL in `20260414`
```sql
CREATE TABLE public.role_layouts (
  id        uuid   DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id   uuid   NOT NULL REFERENCES public.roles(id)   ON DELETE CASCADE,
  layout_id bigint NOT NULL REFERENCES public.layouts(id) ON DELETE CASCADE,
  UNIQUE (role_id, layout_id)
);
```
Semantics: no rows for a layout ⇒ public to all members; ≥1 row ⇒ visible
only to holders of a listed role (plus creator / `read:layouts`).

### invitations — full DDL in `20260417`
```sql
CREATE TABLE invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id)   ON DELETE CASCADE,
  email       text NOT NULL,
  role_id     uuid          REFERENCES roles(id)      ON DELETE SET NULL,
  invited_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','revoked')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days'
);
```
`status` is CHECK-constrained text (not an enum).

---

## FUNCTIONS (14 catalog functions)

All `SET search_path = public`. "SD" = `SECURITY DEFINER`. "Grant" = explicit
`GRANT EXECUTE` in migration (blank = none beyond default).

| # | Signature → return | Lang / Vol / Sec | Grant | Essence | Source |
|---|---|---|---|---|---|
| 1 | `is_project_member(p_project_id uuid)` → boolean | sql / STABLE / SD | — | `EXISTS` in `user_projects` where `user_id=auth.uid() AND project_id=p_project_id` | 20260404 |
| 2 | `has_permission(p_project_id uuid, p_action text, p_subject text)` → boolean | sql / STABLE / SD | — | `EXISTS` join `user_roles→roles→role_permissions→permissions` where `ur.user_id=auth.uid() AND r.project_id=p_project_id AND p.action=p_action AND (p.subject=p_subject OR p.subject='all')` | 20260404; wildcard `OR subject='all'` added 20260411194700 |
| 3 | `is_project_creator(p_project_id uuid)` → boolean | sql / STABLE / SD | — | `EXISTS projects WHERE id=p_project_id AND creator_id=auth.uid()` | 20260404 |
| 4 | `get_project_id_for_schema(p_schema_id uuid)` → uuid | sql / STABLE / SD | — | `SELECT project_id FROM schemas WHERE id=p_schema_id` (used by `fields` RLS) | 20260404 |
| 5 | `get_project_id_for_layout(p_layout_id int8)` → uuid | sql / STABLE / SD | — | `SELECT project_id FROM layouts WHERE id=p_layout_id` (used by `components` RLS) | 20260404 |
| 6 | `get_project_member_emails(p_project_id uuid)` → TABLE(user_id uuid, email text) | plpgsql / STABLE / SD | authenticated | early-return unless `is_project_member`; then `auth.users u JOIN user_projects up ON up.user_id=u.id WHERE up.project_id=p_project_id` | 20260404 |
| 7 | `get_project_id_for_layout_unchecked(p_layout_id bigint)` → uuid | sql / STABLE / SD | — | same body as #5; used by `role_layouts` RLS to break layouts↔role_layouts recursion | 20260416 |
| 8 | `get_project_id_for_invitation(p_invitation_id uuid)` → uuid | sql / STABLE / SD | — | `SELECT project_id FROM invitations WHERE id=p_invitation_id LIMIT 1` | 20260417 |
| 9 | `accept_invitation(p_token uuid)` → json | plpgsql / VOLATILE / SD | — | get caller email from `auth.users`; find invite by `token` with `status='pending' AND expires_at>now()`; case-insensitive email match; if already member → mark `accepted`, return `{success,already_member:true}`; else `INSERT user_projects` (+`user_roles` if `role_id`), mark `accepted`. Errors returned as `{error:...}` json (not exceptions) | 20260417 |
| 10 | `update_user_role(p_project_id uuid, p_user_id uuid, p_role_id uuid)` → void | plpgsql / VOLATILE / SD | — | guard `is_project_creator OR has_permission(_,'create','users') OR has_permission(_,'update','roles')` else `RAISE 'Permission denied'`; `DELETE` user's `user_roles` whose role ∈ project; `INSERT` new `(p_user_id,p_role_id)` | 20260419 |
| 11 | `events_daily_counts(p_project_id uuid, p_days integer)` → TABLE(day date, count bigint) | sql / STABLE / **caller (no SD)** | — | `generate_series(current_date-(p_days-1)..current_date)` LEFT JOIN `events` on `date_trunc('day',created_at)` & `project_id`, grouped, zero-filled. Runs as caller ⇒ `events` RLS applies | 20260411185758 |
| 12 | `ingest_event(p_api_key text, p_schema_key text, p_value jsonb)` → TABLE(id bigint, created_at timestamptz) | plpgsql / VOLATILE / SD | anon, authenticated | resolve key by `key_hash=encode(extensions.digest(p_api_key,'sha256'),'hex') AND revoked_at IS NULL` (else `RAISE 'invalid_api_key' ERRCODE P0001`); resolve schema `(project_id,key=p_schema_key,status='active')` (else `'schema_not_found' P0002`); `INSERT events RETURNING id::bigint,created_at::timestamptz`; `UPDATE api_keys SET last_used_at=now()` | 20260421; return-type casts fixed 20260424 |
| 13 | `get_active_fields_for_ingest(p_api_key text, p_schema_key text)` → TABLE(key text, type FieldTypes, required boolean, metadata jsonb) | plpgsql / VOLATILE / SD | anon, authenticated | same key+schema validation as #12; `RETURN QUERY` active fields `f.key::text, f.type, f.required, COALESCE(f.metadata::jsonb,'{}')` | 20260421; casts fixed 20260425 |
| 14 | `get_project_schemas_for_sdk(p_api_key text)` → jsonb | plpgsql / VOLATILE / SD | anon, authenticated | resolve key by hash (else P0001); build `{project:{id,name}, schemas:[{key,name,displayName,fields:[{key,name,displayName,type,required,metadata}]}]}` for `status='active'` schemas+fields ordered by key; `UPDATE api_keys SET last_used_at=now()` | 20260422; `metadata::jsonb` cast fixed 20260423 |

**Migration-only helper (not a persisted catalog function):**
`pg_temp.slugify_key(input text, fallback text) → text` — `plpgsql IMMUTABLE`,
session/temp scoped, used solely by the `20260411181128` key backfill
(lowercase, non-alnum→`_`, trim `_`, fallback, `k_` prefix if leading digit,
truncate 63).

---

## TRIGGERS

**None. Zero triggers on any table in the database.** Deliberate convention:
write-time invariants live in `SECURITY DEFINER` functions (`ingest_event`,
`accept_invitation`, `update_user_role`); read-time access in RLS; cascade
cleanup via `ON DELETE CASCADE` / `SET NULL` FKs; soft delete via explicit
`status` column writes from the app. No `updated_at` trigger, no audit
trigger, no fan-out trigger.

---

## INDEXES

| Index | Table | Columns | Kind | Source |
|---|---|---|---|---|
| `idx_projects_creator_id` | projects | (creator_id) | btree | 20260404 |
| `idx_user_projects_user_id` | user_projects | (user_id) | btree | 20260404 |
| `idx_user_projects_project_id` | user_projects | (project_id) | btree | 20260404 |
| `idx_user_projects_user_project` | user_projects | (user_id, project_id) | btree | 20260404 |
| `idx_user_roles_user_id` | user_roles | (user_id) | btree | 20260404 |
| `idx_user_roles_role_id` | user_roles | (role_id) | btree | 20260404 |
| `idx_roles_project_id` | roles | (project_id) | btree | 20260404 |
| `idx_role_permissions_role_id` | role_permissions | (role_id) | btree | 20260404 |
| `idx_role_permissions_permission_id` | role_permissions | (permission_id) | btree | 20260404 |
| `idx_permissions_action_subject` | permissions | (action, subject) | btree | 20260404 |
| `idx_schemas_project_id` | schemas | (project_id) | btree | 20260404 |
| `idx_fields_schema_id` | fields | (schema_id) | btree | 20260404 |
| `idx_events_project_id` | events | (project_id) | btree | 20260404 |
| `idx_layouts_project_id` | layouts | (project_id) | btree | 20260404 |
| `idx_components_layout_id` | components | (layout_id) | btree | 20260404 |
| `idx_api_keys_project_id` | api_keys | (project_id) | btree | 20260404 |
| `schemas_project_status_idx` | schemas | (project_id, status) | btree | 20260411181128 |
| `fields_schema_status_idx` | fields | (schema_id, status) | btree | 20260411181128 |
| `schemas_project_key_unique` | schemas | (project_id, key) | UNIQUE constraint | 20260411181128 |
| `fields_schema_key_unique` | fields | (schema_id, key) | UNIQUE constraint | 20260411181128 |
| `events_project_schema_created_idx` | events | (project_id, schema_id, created_at DESC) | btree | 20260421 |
| `api_keys_key_hash_idx` | api_keys | (key_hash) | UNIQUE | 20260421 |
| `idx_role_layouts_layout_id` | role_layouts | (layout_id) | btree | 20260414 |
| `idx_role_layouts_role_id` | role_layouts | (role_id) | btree | 20260414 |
| `role_layouts` UNIQUE | role_layouts | (role_id, layout_id) | UNIQUE constraint | 20260414 |
| `invitations_pending_unique` | invitations | (project_id, email) **WHERE status='pending'** | partial UNIQUE | 20260417 |
| `invitations_token_idx` | invitations | (token) | btree | 20260417 |
| `invitations` token UNIQUE | invitations | (token) | UNIQUE constraint | 20260417 |

---

## RLS

**RLS enabled on all 14 tables.** Enabled in `20260404` for the first 12
(projects, user_projects, roles, user_roles, permissions, role_permissions,
schemas, fields, events, layouts, components, api_keys); `role_layouts` in
`20260414`; `invitations` in `20260417`. **Every policy targets role
`authenticated`.** Grants: `20260404` `GRANT ALL` to `authenticated` on all
except `permissions` (`GRANT SELECT`), plus `GRANT USAGE, SELECT ON ALL
SEQUENCES`; `role_layouts` `GRANT ALL` (`20260414`). Ingestion/SDK functions
additionally `GRANT EXECUTE … TO anon, authenticated`.

Format: `policy_name` — CMD — `USING` / `WITH CHECK`. UPDATE policies apply
the shown predicate to both USING and WITH CHECK unless stated.

### projects
- `projects_select_member` — SELECT — `is_project_member(id) OR creator_id = auth.uid()`
- `projects_insert_authenticated` — INSERT — CHECK `creator_id = auth.uid()`
- `projects_update_creator` — UPDATE — `creator_id = auth.uid()`
- `projects_delete_creator` — DELETE — `creator_id = auth.uid() OR has_permission(id,'delete','projects')`

### user_projects
- `user_projects_select` — SELECT — `user_id = auth.uid() OR has_permission(project_id,'read','users') OR is_project_creator(project_id)` *(replaced `user_projects_select_own` in 20260418)*
- `user_projects_insert_self_as_creator` — INSERT — CHECK `user_id = auth.uid() AND is_project_creator(project_id)`
- `user_projects_delete` — DELETE — `NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=project_id AND p.creator_id=user_id) AND (user_id = auth.uid() OR has_permission(project_id,'delete','users'))`

### roles
- `roles_select_member` — SELECT — `is_project_member(project_id)`
- `roles_insert` — INSERT — CHECK `is_project_creator(project_id) OR has_permission(project_id,'create','roles')`
- `roles_update` — UPDATE — `has_permission(project_id,'update','roles')`
- `roles_delete` — DELETE — `has_permission(project_id,'delete','roles')`

### user_roles
- `user_roles_select` — SELECT — `user_id = auth.uid() OR EXISTS(SELECT 1 FROM roles r WHERE r.id=role_id AND (has_permission(r.project_id,'read','users') OR has_permission(r.project_id,'read','roles') OR is_project_creator(r.project_id)))` *(replaced `user_roles_select_own` in 20260420)*
- `user_roles_insert` — INSERT — CHECK `(user_id=auth.uid() AND EXISTS(SELECT 1 FROM roles r WHERE r.id=role_id AND is_project_creator(r.project_id))) OR EXISTS(SELECT 1 FROM roles r WHERE r.id=role_id AND has_permission(r.project_id,'create','users'))`
- `user_roles_delete` — DELETE — `user_id=auth.uid() OR EXISTS(SELECT 1 FROM roles r WHERE r.id=role_id AND has_permission(r.project_id,'delete','users'))`

### permissions
- `permissions_select_authenticated` — SELECT — `true` (read-only catalogue; no INSERT/UPDATE/DELETE policy, only `GRANT SELECT`)

### role_permissions
- `role_permissions_select_member` — SELECT — `EXISTS(SELECT 1 FROM roles r WHERE r.id=role_id AND is_project_member(r.project_id))`
- `role_permissions_insert` — INSERT — CHECK `EXISTS(SELECT 1 FROM roles r WHERE r.id=role_id AND (is_project_creator(r.project_id) OR has_permission(r.project_id,'update','roles')))`
- `role_permissions_delete` — DELETE — `EXISTS(SELECT 1 FROM roles r WHERE r.id=role_id AND has_permission(r.project_id,'update','roles'))`

### schemas
- `schemas_select_member` — SELECT — `is_project_member(project_id)`
- `schemas_insert` — INSERT — CHECK `has_permission(project_id,'create','schemas')`
- `schemas_update` — UPDATE — `has_permission(project_id,'update','schemas')`
- `schemas_delete` — DELETE — `has_permission(project_id,'delete','schemas')`

### fields (delegates to parent schema's project)
- `fields_select_member` — SELECT — `is_project_member(get_project_id_for_schema(schema_id))`
- `fields_insert` — INSERT — CHECK `has_permission(get_project_id_for_schema(schema_id),'create','fields')`
- `fields_update` — UPDATE — `has_permission(get_project_id_for_schema(schema_id),'update','fields')`
- `fields_delete` — DELETE — `has_permission(get_project_id_for_schema(schema_id),'delete','fields')`

### events
- `events_select_member` — SELECT — `is_project_member(project_id)`
- `events_insert` — INSERT — CHECK `has_permission(project_id,'create','events')`
- `events_update` — UPDATE — `has_permission(project_id,'update','events')`
- `events_delete` — DELETE — `has_permission(project_id,'delete','events')`

### layouts (SELECT is role-gated; final form, defined 20260414, re-asserted 20260415)
- `layouts_select_member` — SELECT — `is_project_member(project_id) AND ( NOT EXISTS(SELECT 1 FROM role_layouts rl WHERE rl.layout_id=layouts.id) OR EXISTS(SELECT 1 FROM role_layouts rl JOIN user_roles ur ON ur.role_id=rl.role_id WHERE rl.layout_id=layouts.id AND ur.user_id=auth.uid()) OR is_project_creator(project_id) OR has_permission(project_id,'read','layouts') )`
- `layouts_insert` — INSERT — CHECK `has_permission(project_id,'create','layouts')`
- `layouts_update` — UPDATE — `has_permission(project_id,'update','layouts')`
- `layouts_delete` — DELETE — `has_permission(project_id,'delete','layouts')`

### components (delegates to parent layout's project)
- `components_select_member` — SELECT — `is_project_member(get_project_id_for_layout(layout_id))`
- `components_insert` — INSERT — CHECK `has_permission(get_project_id_for_layout(layout_id),'create','components')`
- `components_update` — UPDATE — `has_permission(get_project_id_for_layout(layout_id),'update','components')`
- `components_delete` — DELETE — `has_permission(get_project_id_for_layout(layout_id),'delete','components')`

### api_keys (SELECT is permission-gated, unlike most tables)
- `api_keys_select` — SELECT — `has_permission(project_id,'read','api_keys')`
- `api_keys_insert` — INSERT — CHECK `has_permission(project_id,'create','api_keys')`
- `api_keys_update` — UPDATE — `has_permission(project_id,'update','api_keys')`
- `api_keys_delete` — DELETE — `has_permission(project_id,'delete','api_keys')`

### role_layouts (final form post-20260416; initial 20260414 version sub-selected `layouts` directly → infinite RLS recursion, replaced)
- `role_layouts_select_member` — SELECT — `is_project_member(get_project_id_for_layout_unchecked(layout_id))`
- `role_layouts_insert` — INSERT — CHECK `has_permission(get_project_id_for_layout_unchecked(layout_id),'update','layouts')`
- `role_layouts_delete` — DELETE — `has_permission(get_project_id_for_layout_unchecked(layout_id),'update','layouts')`

(`role_layouts` is gated by `update:layouts`, not a dedicated subject.)

### invitations (20260417)
- `invitations_select` — SELECT — `is_project_member(project_id)`
- `invitations_insert` — INSERT — CHECK `has_permission(project_id,'create','users') AND invited_by = auth.uid()`
- `invitations_update` — UPDATE — `has_permission(project_id,'create','users')` (used for revoke)
- `invitations_delete` — DELETE — `has_permission(project_id,'delete','users')`

### RLS behavioural notes
- `SECURITY DEFINER` ingestion/SDK RPCs (#12–14) **bypass RLS by design**;
  anonymous SDK callers have no session — the hashed API key is the auth.
- Helpers are `SECURITY DEFINER` to avoid policy recursion (a policy on
  `user_roles` that itself reads `user_roles`, or `layouts`↔`role_layouts`).
- **RLS silent no-op:** a PostgREST `UPDATE`/`DELETE` blocked by RLS returns
  HTTP 200 with **0 rows**, not 403 — indistinguishable from "filter matched
  nothing." Mitigation pattern in app code: chain `.select('id')` on the
  mutation, count returned rows, translate 0 → explicit 403/error. Reference
  impl: `src/app/(api)/api/project/events/route.ts` (DELETE → 403 if
  `deleted===0`, 207 if partial, `MAX_DELETE_BATCH=500`) and
  `src/shared/api/event/event.api.ts` (re-throws on `!response.ok` because
  `restApiFetcher` sets `throwHttpErrors:false`).

---

## MIGRATION MAP (19 files, `supabase/migrations/`)

| File | Effect |
|---|---|
| `20260314173820_remote_schema.sql` | **empty** (base schema is remote-only) |
| `20260404_add_rls_policies.sql` | enable RLS on 12 tables; helpers #1–6; all base policies; 16 FK/membership indexes; table GRANTs |
| `20260411181128_schemas_immutable_contracts.sql` | `schemas`/`fields` `key`/`display_name`/`status` (+`required`); enums `schema_status`,`field_status`; backfill+dedup (`pg_temp.slugify_key`); unique constraints; status indexes |
| `20260411185758_event_stats_rpc.sql` | `events_daily_counts` (#11) |
| `20260411194700_has_permission_subject_wildcard.sql` | `has_permission` `subject='all'` wildcard |
| `20260412_layout_component_columns.sql` | `layouts.color`; `components.visualization`,`schema_id`(FK SET NULL),`type` default; recreate `layout_id` FK as ON DELETE CASCADE |
| `20260413_component_span.sql` | `components.span` |
| `20260414_role_layouts.sql` | `role_layouts` table+indexes+RLS; rewrite `layouts` SELECT (role-gated) |
| `20260415_fix_layouts_select_policy.sql` | re-assert role-gated `layouts` SELECT (idempotent) |
| `20260416_fix_role_layouts_rls.sql` | `get_project_id_for_layout_unchecked` (#7); rewrite `role_layouts` policies (break recursion) |
| `20260417_invitations.sql` | `invitations` table+indexes+RLS; `get_project_id_for_invitation` (#8); `accept_invitation` (#9) |
| `20260418_fix_user_projects_select.sql` | widen `user_projects` SELECT (`read:users`/creator) |
| `20260419_update_user_role_fn.sql` | `update_user_role` (#10) |
| `20260420_fix_user_roles_select.sql` | widen `user_roles` SELECT (`read:users`/`read:roles`/creator) |
| `20260421_event_ingestion.sql` | `pgcrypto`; `api_keys` hash/audit cols+backfill; `api_keys_key_hash_idx`; `ingest_event` (#12), `get_active_fields_for_ingest` (#13); `events_project_schema_created_idx` |
| `20260422_sdk_schemas_fn.sql` | `get_project_schemas_for_sdk` (#14) |
| `20260423_fix_sdk_schemas_jsonb_cast.sql` | `metadata::jsonb` cast in #14 |
| `20260424_fix_ingest_event_return_types.sql` | `id::bigint`/`created_at::timestamptz` casts in #12 |
| `20260425_fix_get_fields_return_types.sql` | `key::text`/`metadata::jsonb` casts in #13 |

Migrations are written idempotently (`IF NOT EXISTS`, `DROP POLICY IF
EXISTS`, `CREATE OR REPLACE`) and are safe to re-run. Caveat: the set is
**not** self-contained — a from-scratch rebuild fails because base table DDL
lives only on the remote DB (capture via `supabase db dump` into the empty
`20260314173820` placeholder to fix).
