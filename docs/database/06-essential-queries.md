# Essential Queries

> Part 6 of the Hotlog database documentation.
> Aggregates the inspection queries from docs
> [01](./01-data-contracts-and-events.md) /
> [02](./02-access-control-and-identity.md) /
> [03](./03-dashboards-and-visualization.md) /
> [04](./04-supabase-infrastructure-and-operations.md) into a single
> reference. 16 queries; an explanation accompanies each.

Run these in the Supabase SQL editor / `psql`. The `postgres` role bypasses
RLS, so you see the full project. Replace `<placeholders>` (`<project_id>`,
`<schema_key>`, `<layout_id>`, `<user_id>`, …) before running. **Never
select `key` or `key_hash` from `api_keys`** — the raw key is unrecoverable
and the hash is the credential.

---

## 1. Schemas in a project, with active-field and event counts

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

A one-row-per-schema health view: how many *active* fields each schema
declares, how many events have ever been ingested against it, and when the
most recent one arrived. Useful for spotting unused schemas (zero events) and
for confirming a freshly defined contract is actually receiving traffic.

## 2. Full field contract for one schema (active and archived)

```sql
select f.key, f.display_name, f.type, f.required, f.status, f.metadata
from   fields f
join   schemas s on s.id = f.schema_id
where  s.project_id = '<project_id>'
  and  s.key = '<schema_key>'
order  by f.status, f.key;
```

Dumps the full immutable contract for a single schema — including archived
fields — exactly as the SDK and ingestion path see it. `archived` rows appear
first because they are the most common source of surprises ("why isn't this
field being accepted any more"). `metadata` reveals type-specific config
(`enumValues`, `numberRange`, `itemType`, `description`).

## 3. Most recent events for a project, with the schema key resolved

```sql
select e.id, s.key as schema, e.created_at, e.value
from   events e
join   schemas s on s.id = e.schema_id
where  e.project_id = '<project_id>'
order  by e.created_at desc
limit  50;
```

The primary data-exploration query: the last 50 ingested events with their
schema key resolved (so you do not have to memorise UUIDs). Backed by
`events_project_schema_created_idx`, so it stays fast even on a large
`events` table. The `value` JSONB is keyed by field `key` — match it against
query 2 to interpret.

## 4. Daily event volume for the last 30 days (via the shipped RPC)

```sql
select * from events_daily_counts('<project_id>'::uuid, 30);
```

Calls the function the dashboard uses (`events_daily_counts`,
`20260411185758_event_stats_rpc.sql`). The series is **zero-filled** via
`generate_series`, so days with no events still appear as rows with
`count = 0` — no client-side gap patching required. Unlike the
ingestion/SDK RPCs, this one runs as the caller, so `events` RLS still
applies.

## 5. All members of a project — email + assigned roles

```sql
select u.email,
       up.user_id,
       coalesce(array_agg(r.name) filter (where r.id is not null), '{}') as roles
from   user_projects up
join   auth.users u        on u.id = up.user_id
left   join user_roles ur  on ur.user_id = up.user_id
left   join roles r        on r.id = ur.role_id and r.project_id = up.project_id
where  up.project_id = '<project_id>'
group  by u.email, up.user_id
order  by u.email;
```

Joins `user_projects` to `auth.users` to recover emails (which the app
normally only sees via the `get_project_member_emails` RPC), and aggregates
each member's assigned roles **within this project** — the `r.project_id =
up.project_id` join condition is important since a user can hold roles in
several projects.

## 6. Permission matrix for a project (role → granted `action:subject`)

```sql
select r.name as role,
       p.action || ':' || p.subject as permission
from   roles r
join   role_permissions rp on rp.role_id = r.id
join   permissions p       on p.id = rp.permission_id
where  r.project_id = '<project_id>'
order  by r.name, permission;
```

A flat dump of the RBAC table for one project: every role and every
`action:subject` it grants. This is the same data the frontend CASL ability
is built from. Rows with `subject = 'all'` are wildcards — see query 7 for
the resolved view.

## 7. Effective permissions for one user (mirrors `has_permission`)

```sql
select distinct p.action,
       case when p.subject = 'all' then '* (wildcard)' else p.subject end as subject
from   user_roles ur
join   roles r             on r.id = ur.role_id
join   role_permissions rp on rp.role_id = r.id
join   permissions p       on p.id = rp.permission_id
where  ur.user_id   = '<user_id>'
  and  r.project_id = '<project_id>'
order  by subject, p.action;
```

Walks the exact 4-way join that the `has_permission()` RLS helper uses,
showing every `action:subject` a specific user is allowed in a specific
project. The `case` on `subject = 'all'` makes the wildcard
(`20260411194700_has_permission_subject_wildcard.sql`) visible — remember
the wildcard applies only to the *subject*, never the *action*.

## 8. Outstanding invitations (and which have silently expired)

```sql
select email,
       status,
       expires_at,
       (status = 'pending' and expires_at < now()) as expired
from   invitations
where  project_id = '<project_id>'
order  by created_at desc;
```

Lists every invite for a project with a derived `expired` flag — an invite
that is still `pending` past its `expires_at` is dead, but `accept_invitation`
will just return `Invalid or expired invitation` without flipping the row's
status, so they accumulate. Useful before re-issuing an invite, since
`invitations_pending_unique` blocks a second `pending` row for the same
`(project_id, email)`.

## 9. Layouts in a project — component count + public/restricted

```sql
select l.id,
       l.name,
       l.color,
       count(c.id) as components,
       case when exists (select 1 from role_layouts rl where rl.layout_id = l.id)
            then 'restricted' else 'public' end as visibility
from   layouts l
left   join components c on c.layout_id = l.id
where  l.project_id = '<project_id>'
group  by l.id
order  by l.name;
```

Project-level dashboard overview: every layout, how many components it
holds, and whether its visibility is `public` (no `role_layouts` rows ⇒
visible to all members) or `restricted` (≥1 row ⇒ visible only to specific
roles plus the creator/`read:layouts` holders).

## 10. The components of one layout, in display order, with bound schema

```sql
select c.index, c.name, c.visualization, c.span, s.key as bound_schema
from   components c
left   join schemas s on s.id = c.schema_id
where  c.layout_id = <layout_id>
order  by c.index;
```

Resolves one layout into its visible chart strip. `c.index` is the
application-managed display order; `visualization` (`line`, `bar`, …) is the
real chart type — ignore the legacy `type` column. A `bound_schema` of `NULL`
means the component is unbound or has been orphaned by query 12's situation.

## 11. Which roles can see each restricted layout

```sql
select l.name as layout, r.name as role
from   role_layouts rl
join   layouts l on l.id = rl.layout_id
join   roles r   on r.id = rl.role_id
where  l.project_id = '<project_id>'
order  by l.name, r.name;
```

Only restricted layouts appear (public ones have no `role_layouts` rows).
Combine with the membership view in query 5 to answer "who can actually see
this dashboard" — `role_layouts` is the explicit allow-list; project
creators and `read:layouts` holders see every layout regardless and are not
listed here.

## 12. Impact analysis — components bound to a schema

```sql
select l.name as layout, c.name as component, c.visualization
from   components c
join   layouts l on l.id = c.layout_id
join   schemas s on s.id = c.schema_id
where  s.project_id = '<project_id>'
  and  s.key = '<schema_key>';
```

Run this **before archiving a schema**. Archiving only flips
`status = 'archived'`, but the `components.schema_id` FK has `ON DELETE SET
NULL` — so if you ever fully delete a schema, every component listed here
gets silently orphaned (its `schema_id` becomes `NULL`). The query surfaces
exactly which dashboards will break.

## 13. API-key inventory for a project (safe columns only)

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

The credentials view that is safe to share. `key_prefix` is the 8-character
identifier shown in the UI; `last_used_at` is touched by every successful
`ingest_event` / SDK RPC; a non-null `revoked_at` means the key is rejected
at lookup time even though the row is preserved for audit. Never include
`key` or `key_hash` here.

## 14. Stale / never-used keys — rotation candidates

```sql
select id, key_prefix, last_used_at
from   api_keys
where  project_id = '<project_id>'
  and  revoked_at is null
  and  (last_used_at is null or last_used_at < now() - interval '90 days')
order  by last_used_at nulls first;
```

The rotation candidate list: live (non-revoked) keys that have either never
been used or have not been used in 90 days. `nulls first` puts the
never-used ones at the top because those are the most likely to be safe to
revoke without breaking a live integration.

## 15. Operational audit — RLS status & policy count for every public table

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

The single sanity check that confirms Hotlog's authorization boundary is
still in place: every public table should have `rls_enabled = true` and a
non-zero policy count. A `false` or a `0` here is a security incident — it
means a table is reachable without any access checks. Run after every
migration that touches RLS.

## 16. Diagnose an RLS silent no-op (does this user *actually* hold the permission?)

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

The investigative query for the canonical Hotlog gotcha: an `UPDATE` /
`DELETE` that returns HTTP 200 with zero rows because RLS silently blocked
it (see
[Ops doc §RLS silent no-ops](./04-supabase-infrastructure-and-operations.md#rls-silent-no-ops)).
This runs the same join `has_permission()` runs, so a `false` here is the
proof: the operation is not failing — it is being filtered out. Adapt
`p.action` / `p.subject` to whichever mutation reported phantom success.
