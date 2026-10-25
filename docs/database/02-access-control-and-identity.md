# Access Control & Identity

> Part 2 of 4 of the Hotlog database documentation.
> Related: [Data Contracts & Event Ingestion](./01-data-contracts-and-events.md) ·
> [Dashboards & Visualization](./03-dashboards-and-visualization.md) ·
> [Supabase Infrastructure & Operations](./04-supabase-infrastructure-and-operations.md)

## Scope

This domain owns **who can do what**. It contains the multi-tenant boundary
(`projects` + `user_projects`), the RBAC model (`roles`, `user_roles`,
`permissions`, `role_permissions`), the invitation flow (`invitations`), and —
crucially — the **RLS framework itself**: the `SECURITY DEFINER` helper
functions that every other document's policies call into.

Every policy in the entire database ultimately reduces to one of three
questions answered here:

- `is_project_member(project_id)` — are you in this project at all?
- `is_project_creator(project_id)` — are you its owner?
- `has_permission(project_id, action, subject)` — does one of your roles grant
  this `action:subject`?

Identity comes from Supabase Auth: `auth.uid()` is the current user's UUID and
`auth.users` holds emails. Hotlog never stores passwords or a separate users
table — `user_projects.user_id`, `roles`, etc. all reference `auth.users(id)`.

> Base table DDL (PKs, defaults, FKs) for `projects`/`roles`/`permissions`
> etc. was applied directly on the hosted project; the empty
> `20260314173820_remote_schema.sql` is a placeholder. Columns below are from
> `database.types.ts`; constraints/policies from the migration that added
> them. See [the Ops doc](./04-supabase-infrastructure-and-operations.md) for
> the schema-source explanation.

---

## Tables

### `projects` — the tenant boundary

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | |
| `creator_id` | `uuid` | The owning user (`auth.users.id`) |
| `created_at` | `timestamptz` | |

The creator is a super-user *within their project*: many policies short-circuit
on `is_project_creator()` so a project owner is never locked out by RBAC.

### `user_projects` — membership (user ↔ project)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Surrogate PK |
| `user_id` | `uuid` | `auth.users.id` |
| `project_id` | `uuid` | FK → `projects.id` (`user_projects_project_id_fkey`) |

> Per `database.types.ts` this is a **surrogate-`id` join table**, not a
> composite-PK table. Membership uniqueness is by convention/RLS, not a
> visible composite key.

### `roles` & `user_roles`

`roles`: `id uuid` PK, `project_id` (FK → `projects.id`), `name`,
`created_at`. A role is project-scoped.

`user_roles`: `id uuid` PK, `user_id` (`auth.users.id`), `role_id` (FK →
`roles.id`). Assigns a role to a user. Again surrogate-`id`, not composite.

### `permissions` & `role_permissions`

`permissions`: `id uuid` PK, `action text`, `subject text`. A flat catalogue
of `(action, subject)` pairs (e.g. `create:schemas`, `delete:events`,
`read:api_keys`). It is the only table readable by **every** authenticated
user (so the frontend CASL ability can be built). The special subject
`'all'` is a wildcard — see `has_permission` below.

`role_permissions`: `id uuid` PK, `role_id` (FK → `roles.id`),
`permission_id` (FK → `permissions.id`). Grants a permission to a role.

The RBAC chain is therefore:
`auth.uid()` → `user_roles` → `roles` (scoped to `project_id`) →
`role_permissions` → `permissions(action, subject)`.

### `invitations`

Created by `20260417_invitations.sql`:

```sql
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id)     ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role_id     UUID          REFERENCES roles(id)        ON DELETE SET NULL,
  invited_by  UUID NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  token       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','revoked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);
```

`status` is a `CHECK`-constrained `text`, **not** an enum (unlike
`schema_status`/`field_status`). Acceptance is via the `accept_invitation`
RPC below.

---

## Functions / RPCs

### RLS helper functions (the framework)

All defined in `20260404_add_rls_policies.sql` Section A, all `LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public`. They are `SECURITY
DEFINER` so they can read membership/role tables without being blocked by
those tables' own RLS (which would otherwise recurse).

| Function | Body (essence) |
|---|---|
| `is_project_member(p_project_id uuid) → boolean` | `EXISTS` row in `user_projects` for `auth.uid()` + project |
| `is_project_creator(p_project_id uuid) → boolean` | `EXISTS projects WHERE id = p_project_id AND creator_id = auth.uid()` |
| `has_permission(p_project_id, p_action, p_subject) → boolean` | join `user_roles → roles → role_permissions → permissions` for `auth.uid()`, matching `action` exactly and `subject = p_subject OR subject = 'all'` |
| `get_project_id_for_schema(p_schema_id uuid) → uuid` | resolves a schema's project (used by `fields` RLS — see [doc 1](./01-data-contracts-and-events.md)) |
| `get_project_member_emails(p_project_id uuid) → (user_id uuid, email text)` | `plpgsql`; returns early unless `is_project_member`; then joins `auth.users` ↔ `user_projects`. Granted to `authenticated` |

> **`has_permission` wildcard.** `20260411194700_has_permission_subject_wildcard.sql`
> changed the subject test to `p.subject = p_subject OR p.subject = 'all'`.
> So `delete:all` grants delete on every subject, matching the frontend CASL
> semantics. The **action is still matched exactly** — `create:all` does *not*
> grant `delete:events`.

`get_project_id_for_layout` / `get_project_id_for_layout_unchecked` are RLS
helpers too but belong to the layouts domain — see
[Dashboards & Visualization](./03-dashboards-and-visualization.md).
`get_project_id_for_invitation` is listed below.

### `accept_invitation(p_token uuid) → json`

`plpgsql SECURITY DEFINER` (`20260417_invitations.sql`). Bypasses RLS so a
freshly-invited user (not yet a member, so no row would be visible) can accept.
Steps:

1. Look up the caller's email from `auth.users` by `auth.uid()`; error
   `Not authenticated` if none.
2. Find the invitation by `token` where `status='pending' AND expires_at >
   now()`; error `Invalid or expired invitation` if none.
3. Case-insensitive email match against the invite; error if mismatched.
4. If already a member: mark invitation `accepted`, return
   `{success, project_id, already_member:true}`.
5. Otherwise `INSERT INTO user_projects`, optionally `INSERT INTO user_roles`
   if the invite carried a `role_id`, mark `accepted`, return
   `{success, project_id, already_member:false}`.

Returns a `json` object (errors are `{ "error": "..." }`, not exceptions).
Called from `src/app/(api)/api/invite/accept/route.ts`.

### `get_project_id_for_invitation(p_invitation_id uuid) → uuid`

`SECURITY DEFINER` helper from `20260417` — resolves an invitation's project
without tripping RLS recursion (mirrors the layout-unchecked pattern).

### `update_user_role(p_project_id, p_user_id, p_role_id) → void`

`plpgsql SECURITY DEFINER` (`20260419_update_user_role_fn.sql`). Guards with
`is_project_creator OR has_permission(create:users) OR has_permission(update:roles)`,
raising `Permission denied` otherwise. Then it **replaces** the user's roles
*for that project* (`DELETE` the user's `user_roles` whose role belongs to the
project, then `INSERT` the new one). Called from
`src/app/(api)/api/project/members/route.ts` (PUT).

`get_project_member_emails` is also invoked as an RPC from
`src/app/(api)/api/project/members/route.ts` and
`…/api/project/invitations/route.ts`.

---

## Triggers

**None.** There are no triggers on any access-control table. Role/membership
mutations go through ordinary RLS-checked `INSERT`/`DELETE` from the API
layer, or through the `SECURITY DEFINER` functions above
(`accept_invitation`, `update_user_role`) which perform their own explicit
permission checks in `plpgsql`. There is no trigger auto-granting a default
role, no audit trigger, and no trigger keeping `user_roles` in sync — the
"replace roles" behaviour is coded explicitly inside `update_user_role`. This
keeps the authorization path inspectable in one place rather than split across
hidden trigger functions.

---

## Indexes

| Index | Table | Columns | Kind | Source |
|---|---|---|---|---|
| `idx_projects_creator_id` | `projects` | `(creator_id)` | btree | `20260404` |
| `idx_user_projects_user_id` | `user_projects` | `(user_id)` | btree | `20260404` |
| `idx_user_projects_project_id` | `user_projects` | `(project_id)` | btree | `20260404` |
| `idx_user_projects_user_project` | `user_projects` | `(user_id, project_id)` | btree | `20260404` |
| `idx_user_roles_user_id` | `user_roles` | `(user_id)` | btree | `20260404` |
| `idx_user_roles_role_id` | `user_roles` | `(role_id)` | btree | `20260404` |
| `idx_roles_project_id` | `roles` | `(project_id)` | btree | `20260404` |
| `idx_role_permissions_role_id` | `role_permissions` | `(role_id)` | btree | `20260404` |
| `idx_role_permissions_permission_id` | `role_permissions` | `(permission_id)` | btree | `20260404` |
| `idx_permissions_action_subject` | `permissions` | `(action, subject)` | btree | `20260404` |
| `invitations_pending_unique` | `invitations` | `(project_id, email)` **WHERE `status='pending'`** | partial unique | `20260417` |
| `invitations_token_idx` | `invitations` | `(token)` | btree | `20260417` |

The composite/FK indexes above are what keep the `has_permission` 4-way join
and the membership checks cheap — those functions run inside *every* RLS
policy evaluation, so these indexes are load-bearing for the whole database's
read performance. The partial unique index enforces "one pending invite per
email per project" while still allowing re-invites after revoke/accept.

---

## RLS policies

RLS is enabled on `projects`, `user_projects`, `roles`, `user_roles`,
`permissions`, `role_permissions` in `20260404_add_rls_policies.sql`, and on
`invitations` in `20260417`. Two SELECT policies were later widened
(`20260418`, `20260420`). All target `authenticated`.

**projects**

| Cmd | Predicate |
|---|---|
| SELECT | `is_project_member(id) OR creator_id = auth.uid()` |
| INSERT | `WITH CHECK creator_id = auth.uid()` |
| UPDATE | `creator_id = auth.uid()` (USING + WITH CHECK) |
| DELETE | `creator_id = auth.uid() OR has_permission(id,'delete','projects')` |

**user_projects** (SELECT replaced by `20260418_fix_user_projects_select.sql`)

| Cmd | Predicate |
|---|---|
| SELECT (`user_projects_select`) | `user_id = auth.uid() OR has_permission(project_id,'read','users') OR is_project_creator(project_id)` |
| INSERT | `user_id = auth.uid() AND is_project_creator(project_id)` |
| DELETE | creator can't be removed (`NOT EXISTS` creator match) **AND** (`user_id = auth.uid()` OR `has_permission(project_id,'delete','users')`) |

**roles**: SELECT `is_project_member`; INSERT `is_project_creator OR
has_permission(create:roles)`; UPDATE `has_permission(update:roles)`; DELETE
`has_permission(delete:roles)`.

**user_roles** (SELECT replaced by `20260420_fix_user_roles_select.sql`)

| Cmd | Predicate |
|---|---|
| SELECT (`user_roles_select`) | `user_id = auth.uid()` OR (via the role's project) `has_permission(read:users) OR has_permission(read:roles) OR is_project_creator` |
| INSERT | bootstrap: self + `is_project_creator` of the role's project; **or** `has_permission(create:users)` on the role's project |
| DELETE | `user_id = auth.uid()` or `has_permission(delete:users)` on the role's project |

**permissions**: SELECT `USING (true)` — readable by all authenticated users.
(`GRANT SELECT` only; no write policies → effectively read-only catalogue.)

**role_permissions**: SELECT requires `is_project_member` of the role's
project; INSERT requires `is_project_creator OR has_permission(update:roles)`;
DELETE requires `has_permission(update:roles)`.

**invitations** (`20260417`): SELECT `is_project_member(project_id)`; INSERT
`has_permission(project_id,'create','users') AND invited_by = auth.uid()`;
UPDATE `has_permission(create:users)` (used for revoke); DELETE
`has_permission(delete:users)`.

> Why so many helpers are `SECURITY DEFINER`: a policy on `user_roles` that
> needed to read `user_roles` would recurse infinitely. Routing the check
> through a `SECURITY DEFINER` function (which is not itself subject to RLS)
> breaks the cycle. The same pattern recurs for layouts/role_layouts and
> invitations.

---

## Inspecting the data

Run in the Supabase SQL editor / `psql` (the `postgres` role bypasses RLS).
Replace `<placeholders>`. Queries 1 & 5 read `auth.users`.

**1. All members of a project — email + assigned roles**

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

**2. The permission matrix for a project (role → granted `action:subject`)**

```sql
select r.name as role,
       p.action || ':' || p.subject as permission
from   roles r
join   role_permissions rp on rp.role_id = r.id
join   permissions p       on p.id = rp.permission_id
where  r.project_id = '<project_id>'
order  by r.name, permission;
```

**3. The effective permissions for one user** (mirrors `has_permission`'s
join — including the `subject='all'` wildcard)

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

**4. Outstanding invitations (and which have silently expired)**

```sql
select email,
       status,
       expires_at,
       (status = 'pending' and expires_at < now()) as expired
from   invitations
where  project_id = '<project_id>'
order  by created_at desc;
```

**5. Every project a user can reach, with the creator/owner flag**

```sql
select p.id, p.name, (p.creator_id = up.user_id) as is_creator
from   user_projects up
join   projects p on p.id = up.project_id
where  up.user_id = '<user_id>'
order  by p.name;
```

---

## Migration history (this domain)

| Migration | What it did |
|---|---|
| `20260404_add_rls_policies.sql` | Enabled RLS on the 12 core tables, created all 5 access-control helper functions, all base policies, FK/membership indexes, table GRANTs |
| `20260411194700_has_permission_subject_wildcard.sql` | `subject='all'` wildcard in `has_permission` |
| `20260417_invitations.sql` | `invitations` table, its indexes & RLS, `get_project_id_for_invitation`, `accept_invitation` |
| `20260418_fix_user_projects_select.sql` | Widened `user_projects` SELECT (`read:users` / creator) |
| `20260419_update_user_role_fn.sql` | `update_user_role` |
| `20260420_fix_user_roles_select.sql` | Widened `user_roles` SELECT (`read:users` / `read:roles` / creator) |

## Source references

- Migrations: `supabase/migrations/20260404…`, `…194700`, `…17`, `…18`, `…19`, `…20`
- Types: `database.types.ts` (`projects`, `user_projects`, `roles`, `user_roles`, `permissions`, `role_permissions`, `invitations`, Functions block)
- TS interfaces: `src/shared/api/interface/project-role.interface.ts`, `project-permission.interface.ts`, `project-member.interface.ts`, `invitation.interface.ts`, `user-permission.interface.ts`
- API routes: `src/app/(api)/api/project/members/route.ts`, `…/api/invite/accept/route.ts`, `…/api/project/invitations/route.ts`
