# Database Structure

> Structural overview of the Hotlog database — Part 5 of the database
> documentation. This document deliberately does **not** cover individual
> tables or relations (see [00 — Tables & Relations](./00-tables-and-relations.md)
> for that); it describes *what kind of database* Hotlog runs on and the
> functions, triggers, indexes and RLS that shape it.

## The database

Hotlog runs on a single **PostgreSQL** database (reported version `14.4`),
hosted and managed by **Supabase**. There is no separate analytics store, cache
layer or message queue — Postgres is the only data system, and Supabase
provides auth (`auth.users`), the PostgREST API, connection pooling, backups and
point-in-time recovery on top of it. The application connects exclusively with
the publishable/anon key; there is no service-role client, so all privileged
work is done inside the database itself via `SECURITY DEFINER` functions.

One non-default extension is enabled: **`pgcrypto`** (in schema `extensions`),
used to hash API keys with `sha256`. That is the entire surface area of
"general" setup — everything else of substance is the four things below.

---

## Functions

The database has **14 catalog functions** (plus one session-scoped backfill
helper used only during a migration). They fall into three jobs:

**1. Authorization helpers (used by RLS, not called by the app directly).**
These are small, `STABLE`, `SECURITY DEFINER` SQL functions that answer yes/no
questions about the current user inside policy expressions:

- `is_project_member(project)` — is the caller a member of this project?
- `is_project_creator(project)` — is the caller the project owner?
- `has_permission(project, action, subject)` — does the caller hold a role
  granting `action:subject` (or the `all` wildcard) in this project? This is
  the core RBAC check, walking `user_roles → roles → role_permissions →
  permissions`.
- `get_project_id_for_schema / _layout / _layout_unchecked / _invitation` —
  resolve a child row's owning project so a policy on a child table can defer
  to the parent's project. The `_unchecked` variant exists specifically to
  break an RLS recursion cycle between `layouts` and `role_layouts`.

They are `SECURITY DEFINER` on purpose: a policy that itself queries the table
it protects would recurse, so the lookup runs as the function owner and is not
re-subjected to RLS.

**2. Privileged operations (the app's substitute for a service-role key).**
`VOLATILE SECURITY DEFINER` functions that perform multi-step writes which RLS
alone could not express safely:

- `accept_invitation(token)` — validates a pending, unexpired invite, matches
  the caller's email, and creates the membership (and role) atomically;
  returns errors as JSON rather than raising.
- `update_user_role(project, user, role)` — re-assigns a member's role after a
  permission guard.
- `get_project_member_emails(project)` — returns member emails (reading
  `auth.users`, which the app otherwise cannot), guarded by a membership check.

**3. Public ingestion / SDK entry points.** `VOLATILE SECURITY DEFINER`
functions granted to `anon, authenticated`. They are the only path for
unauthenticated SDK traffic — the hashed API key *is* the authentication:

- `ingest_event(api_key, schema_key, value)` — the write path: validate key,
  validate active schema, insert the event, touch `last_used_at`.
- `get_active_fields_for_ingest(api_key, schema_key)` — the fields the SDK
  should validate a payload against.
- `get_project_schemas_for_sdk(api_key)` — the full schema/field tree the SDK
  uses to generate typed bindings.

Plus one analytics function, `events_daily_counts(project, days)` — the only
function that runs **as the caller** (no `SECURITY DEFINER`), so `events` RLS
still applies; it produces a zero-filled daily time series for dashboards.

---

## Triggers

**There are zero triggers in the database — on any table.** This is a
deliberate design choice, not an omission. Every job a trigger would normally
do is handled another way:

- **Write-time invariants** → `SECURITY DEFINER` functions (`ingest_event`,
  `accept_invitation`, `update_user_role`) instead of `BEFORE`/`AFTER`
  triggers.
- **Cascading cleanup** → `ON DELETE CASCADE` / `ON DELETE SET NULL` foreign
  keys instead of `AFTER DELETE` triggers.
- **Soft delete** → an explicit `status` column written by the app instead of
  a delete-intercepting trigger.

The result is that all behaviour is visible declaratively in the schema or in
named functions, with nothing happening implicitly behind a write. There is no
`updated_at` trigger, no audit trigger, and no fan-out trigger.

---

## Indexes

There are roughly **28 indexes and unique constraints**. They are not generic —
each one backs a specific access pattern the application actually uses:

- **Foreign-key / membership lookups.** Single-column btree indexes on every
  `project_id`, `user_id`, `role_id`, `schema_id`, `layout_id`,
  `permission_id` foreign key, plus a composite `(user_id, project_id)` on
  `user_projects` and `(action, subject)` on `permissions`. These make the RLS
  helper functions (`is_project_member`, `has_permission`, the `EXISTS`
  sub-selects) cheap, since RLS runs them on essentially every query.
- **Event read path.** `events (project_id, schema_id, created_at DESC)` — the
  exact shape of dashboard and time-series queries (filter by project + schema,
  newest first).
- **Soft-delete filtering.** `schemas (project_id, status)` and
  `fields (schema_id, status)` — so "only active schemas/fields" scans (used
  heavily by the SDK functions) stay index-supported.
- **API-key authentication.** A **unique** index on `api_keys (key_hash)` —
  every ingest call is an O(1) hash lookup, and the uniqueness prevents
  duplicate keys.
- **Integrity / dashboard visibility.** Unique constraints on
  `schemas (project_id, key)`, `fields (schema_id, key)` (the immutable
  contracts), `role_layouts (role_id, layout_id)`, and a **partial unique**
  index on `invitations (project_id, email) WHERE status = 'pending'` (one
  open invite per email per project); plus the `role_layouts` and invitation
  `token` indexes that back the role-gated layout policy and invite lookups.

In short, the index set is optimized for three hot paths: **RLS evaluation**
(FK/membership lookups), **event ingestion and reading** (the hashed-key lookup
and the project/schema/time composite), and **contract integrity** (the unique
keys that enforce immutability and one-invite-per-email).

---

## Row-Level Security (RLS)

RLS is the real authorization boundary in Hotlog — not the application layer.
**It is enabled on all 14 tables, and every policy targets the
`authenticated` role.** Rather than list per-table policies (see
[genesis.md](../genesis.md) for that), here is *which module of Hotlog each
group of policies protects* and the rule it enforces:

| Module protected | Tables under RLS | What the policies enforce |
|---|---|---|
| **Workspaces / tenancy** | `projects`, `user_projects` | You only see/act on a project you are a member of or created; project deletion is creator-or-`delete:projects`. This is the tenant-isolation root every other policy builds on. |
| **Roles & permissions (RBAC admin)** | `roles`, `user_roles`, `role_permissions`, `permissions` | Members can read the role structure; only the creator or holders of `create/update/delete:roles`/`:users` can change role definitions, assignments and grants. `permissions` is a read-only global catalogue. |
| **Team invitations** | `invitations` | Members can see invites; creating/revoking requires `create:users` (and you must be the inviter); deleting requires `delete:users`. |
| **Data contracts** | `schemas`, `fields` | Any member can read; create/update/delete is permission-gated per subject. `fields` defers to its parent schema's project so the rule is consistent. |
| **Telemetry** | `events` | Members read; insert/update/delete gated by `*:events`. (The public SDK write path bypasses this intentionally — it goes through `SECURITY DEFINER` `ingest_event`, authenticated by the hashed API key, since anonymous callers have no session.) |
| **Ingestion credentials** | `api_keys` | Unlike most tables, even **reading** is permission-gated (`read:api_keys`) — keys are never exposed to ordinary members. All writes are permission-gated too. |
| **Dashboards** | `layouts`, `components`, `role_layouts` | Members read layouts, but the `layouts` SELECT policy is *role-gated*: a layout with `role_layouts` rows is visible only to holders of those roles (plus the creator and `read:layouts`). `components` defer to the parent layout's project; `role_layouts` is gated by `update:layouts`. |

Two structural notes about the RLS design:

- **Helpers are `SECURITY DEFINER` to avoid recursion.** A policy that queried
  the same (or a mutually dependent) table would loop forever; routing the
  check through a definer-rights function breaks the cycle. The
  `layouts ↔ role_layouts` pair needed a dedicated `_unchecked` helper for
  exactly this reason.
- **RLS denial is silent on writes.** A PostgREST `UPDATE`/`DELETE` blocked by
  a policy returns HTTP 200 with **0 rows affected**, not 403 —
  indistinguishable from "filter matched nothing". The application compensates
  by chaining `.select('id')` on mutations and treating an empty result as an
  explicit authorization error. This is a property of the security model worth
  knowing whenever a write "succeeds" but nothing changes.

---

## Summary

| Aspect | Hotlog's database |
|---|---|
| Engine | PostgreSQL 14.4, managed by Supabase |
| Extensions | `pgcrypto` only (API-key hashing) |
| Functions | 14 — RLS helpers, privileged ops, public SDK/ingest entry points |
| Triggers | **None** — replaced by definer functions + FK cascades + status columns |
| Indexes | ~28, optimized for RLS lookups, event ingest/read, and contract integrity |
| RLS | Enabled on all 14 tables; the real authorization boundary, organized per Hotlog module |

## Source references

- Consolidated reference: [`genesis.md`](../genesis.md)
- Generated types: `database.types.ts`
- Migrations: `supabase/migrations/` (`20260404` → `20260425`)
- Per-domain detail: [01](./01-data-contracts-and-events.md) /
  [02](./02-access-control-and-identity.md) /
  [03](./03-dashboards-and-visualization.md) /
  [04](./04-supabase-infrastructure-and-operations.md)
