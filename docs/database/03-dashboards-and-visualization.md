# Dashboards & Visualization

> Part 3 of 4 of the Hotlog database documentation.
> Related: [Data Contracts & Event Ingestion](./01-data-contracts-and-events.md) ·
> [Access Control & Identity](./02-access-control-and-identity.md) ·
> [Supabase Infrastructure & Operations](./04-supabase-infrastructure-and-operations.md)

## Scope

This domain owns the **presentation layer's persistence**: `layouts` (a named
dashboard), `components` (the charts/visualizations inside a layout), and
`role_layouts` (which roles may *see* a given layout). It also owns the two
layout-resolution RLS helpers and the most intricate policy in the codebase —
the role-gated `layouts` SELECT — including the recursion fix that made it
work.

A `component` optionally binds to a schema (`schema_id`) so it can chart that
schema's events. Those upstream concepts live in
[Data Contracts & Event Ingestion](./01-data-contracts-and-events.md);
permissions/roles live in
[Access Control & Identity](./02-access-control-and-identity.md).

> Base table DDL for `layouts`/`components` was applied on the hosted project
> (the `20260314173820` migration is an empty placeholder); columns below come
> from `database.types.ts`, constraints/defaults from the migration that added
> them. `role_layouts` is fully defined in a repo migration. See
> [the Ops doc](./04-supabase-infrastructure-and-operations.md) for the
> schema-source explanation.

---

## Tables

### `layouts`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | PK, identity |
| `project_id` | `uuid` | FK → `projects.id` (`layouts_project_id_fkey`) |
| `name` | `text` | |
| `description` | `text` | |
| `color` | `text` | `NOT NULL DEFAULT '#3b82f6'` — the colored dot in the UI (`20260412`) |
| `created_at` | `timestamptz` | |

### `components`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `layout_id` | `bigint` | FK → `layouts.id`, **`ON DELETE CASCADE`** (`componen_layout_id_fkey`, re-created in `20260412`) |
| `schema_id` | `uuid \| null` | FK → `schemas.id`, **`ON DELETE SET NULL`** (`20260412`) |
| `type` | `ComponentTypes` | enum, single value `TIME_SERIES`; `DEFAULT 'TIME_SERIES'` set in `20260412` (legacy) |
| `visualization` | `text` | `NOT NULL DEFAULT 'line'` — the real chart type, supersedes `type` (`20260412`) |
| `span` | `text` | `NOT NULL DEFAULT 'full'` — `'full'` stacked / `'half'` side-by-side (`20260413`) |
| `name` | `text` | |
| `description` | `text` | |
| `index` | `integer` | display order within the layout |
| `inputs_ids` | `json` | binding of component inputs → schema field keys |

Notes:

- `type` (the `ComponentTypes` enum) is **legacy** — it only ever holds
  `TIME_SERIES`. `visualization` (`'line'`, `'bar'`, …) is the column the UI
  actually uses; `20260412` gave `type` a default purely so inserts that omit
  it don't fail.
- The `layout_id` FK was **dropped and re-added with `ON DELETE CASCADE`** in
  `20260412` so deleting a layout cleans up its components. `schema_id` uses
  `ON DELETE SET NULL` so deleting a schema orphans (rather than destroys) the
  component.

### `role_layouts`

Defined in full in `20260414_role_layouts.sql`:

```sql
CREATE TABLE public.role_layouts (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id   UUID   NOT NULL REFERENCES public.roles(id)    ON DELETE CASCADE,
  layout_id BIGINT NOT NULL REFERENCES public.layouts(id)  ON DELETE CASCADE,
  UNIQUE (role_id, layout_id)
);
```

**Visibility semantics (important):**

- A layout with **no** `role_layouts` rows is **public** to all project
  members.
- A layout with **at least one** `role_layouts` row is visible only to users
  holding one of those roles — *plus* the project creator and anyone with
  `read:layouts` always see every layout.

---

## Functions / RPCs

This domain owns two RLS helpers; both `LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public`.

| Function | Source | Purpose |
|---|---|---|
| `get_project_id_for_layout(p_layout_id int8) → uuid` | `20260404` | Resolve a layout's `project_id`; used by **components** RLS so component policies defer to the parent layout's project |
| `get_project_id_for_layout_unchecked(p_layout_id bigint) → uuid` | `20260416` | Same query, but explicitly named "unchecked" — used by **role_layouts** policies to break an RLS recursion cycle (see below) |

There are no user-facing RPCs in this domain; dashboards are read/written
through ordinary RLS-checked table access from the API routes.

---

## Triggers

**None.** No triggers on `layouts`, `components`, or `role_layouts`. Notably,
cascade cleanup (delete a layout → delete its components; delete a role →
delete its `role_layouts`) is done with **`ON DELETE CASCADE` foreign keys**,
not trigger functions. Component ordering (`index`) is managed by the
application, not a reordering trigger. As elsewhere in Hotlog, declarative
constraints + RLS are preferred over imperative trigger logic so the behaviour
is visible in the schema definition itself.

---

## Indexes

| Index | Table | Columns | Kind | Source |
|---|---|---|---|---|
| `idx_layouts_project_id` | `layouts` | `(project_id)` | btree | `20260404` |
| `idx_components_layout_id` | `components` | `(layout_id)` | btree | `20260404` |
| `idx_role_layouts_layout_id` | `role_layouts` | `(layout_id)` | btree | `20260414` |
| `idx_role_layouts_role_id` | `role_layouts` | `(role_id)` | btree | `20260414` |
| `role_layouts (role_id, layout_id)` | `role_layouts` | `(role_id, layout_id)` | unique constraint | `20260414` |

The two `role_layouts` single-column indexes back the `EXISTS` sub-selects in
the role-gated `layouts` SELECT policy (joined against `user_roles`); the
unique constraint prevents assigning the same role to the same layout twice.

---

## RLS policies

RLS is enabled on `layouts` and `components` in `20260404` and on
`role_layouts` in `20260414`. All target `authenticated`.

**components** — delegates entirely to the parent layout's project:

| Cmd | Predicate |
|---|---|
| SELECT | `is_project_member(get_project_id_for_layout(layout_id))` |
| INSERT | `has_permission(get_project_id_for_layout(layout_id),'create','components')` |
| UPDATE | `has_permission(…,'update','components')` (USING + WITH CHECK) |
| DELETE | `has_permission(…,'delete','components')` |

**layouts** — write policies are the standard pattern (`create`/`update`/
`delete` `:layouts`). The **SELECT** policy is special; its final form
(identical in `20260414` and re-asserted by
`20260415_fix_layouts_select_policy.sql`) is:

```sql
CREATE POLICY "layouts_select_member" ON public.layouts
FOR SELECT TO authenticated
USING (
  is_project_member(project_id)
  AND (
    -- public layout: no role restriction rows
    NOT EXISTS (SELECT 1 FROM public.role_layouts rl
                WHERE rl.layout_id = layouts.id)
    OR
    -- caller holds a role mapped to this layout
    EXISTS (SELECT 1 FROM public.role_layouts rl
            JOIN public.user_roles ur ON ur.role_id = rl.role_id
            WHERE rl.layout_id = layouts.id AND ur.user_id = auth.uid())
    OR is_project_creator(project_id)            -- owner sees all
    OR has_permission(project_id,'read','layouts') -- read:layouts sees all
  )
);
```

**role_layouts** — initially (`20260414`) the policies sub-selected
`public.layouts` directly. That created **infinite recursion**: evaluating
`role_layouts` RLS read `layouts`, whose SELECT policy read `role_layouts`,
…  `20260416_fix_role_layouts_rls.sql` fixed it by introducing
`get_project_id_for_layout_unchecked` (a `SECURITY DEFINER` function, not
subject to RLS) and rewriting the policies to call it:

| Cmd | Predicate (post-`20260416`) |
|---|---|
| SELECT | `is_project_member(get_project_id_for_layout_unchecked(layout_id))` |
| INSERT | `has_permission(get_project_id_for_layout_unchecked(layout_id),'update','layouts')` |
| DELETE | `has_permission(get_project_id_for_layout_unchecked(layout_id),'update','layouts')` |

> Editing `role_layouts` is gated by **`update:layouts`** (not a dedicated
> `:role_layouts` permission) — managing a layout's visibility is considered
> part of managing the layout.

> Same RLS silent-no-op caveat as everywhere: an UPDATE/DELETE blocked by
> these policies returns 200/zero-rows, not 403 — see
> [the Ops doc](./04-supabase-infrastructure-and-operations.md#rls-silent-no-ops).

---

## Inspecting the data

Run in the Supabase SQL editor / `psql` (the `postgres` role bypasses RLS, so
you also see role-restricted layouts). Replace `<placeholders>`.

**1. Layouts in a project — component count + public/restricted**

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

**2. The components of one layout, in display order, with bound schema**

```sql
select c.index, c.name, c.visualization, c.span, s.key as bound_schema
from   components c
left   join schemas s on s.id = c.schema_id
where  c.layout_id = <layout_id>
order  by c.index;
```

**3. Which roles can see each restricted layout**

```sql
select l.name as layout, r.name as role
from   role_layouts rl
join   layouts l on l.id = rl.layout_id
join   roles r   on r.id = rl.role_id
where  l.project_id = '<project_id>'
order  by l.name, r.name;
```

**4. The layouts a specific user can see** (replicates the role-gated
`layouts` SELECT predicate)

```sql
select l.id, l.name
from   layouts l
where  l.project_id = '<project_id>'
  and (
        not exists (select 1 from role_layouts rl where rl.layout_id = l.id)
     or exists (select 1
                  from role_layouts rl
                  join user_roles ur on ur.role_id = rl.role_id
                 where rl.layout_id = l.id and ur.user_id = '<user_id>')
     or l.project_id in (select id from projects where creator_id = '<user_id>')
      )
order  by l.name;
```

**5. Impact analysis — components bound to a schema** (run before archiving
that schema; see [doc 1](./01-data-contracts-and-events.md))

```sql
select l.name as layout, c.name as component, c.visualization
from   components c
join   layouts l on l.id = c.layout_id
join   schemas s on s.id = c.schema_id
where  s.project_id = '<project_id>'
  and  s.key = '<schema_key>';
```

---

## Migration history (this domain)

| Migration | What it did |
|---|---|
| `20260404_add_rls_policies.sql` | `layouts`/`components` RLS, `get_project_id_for_layout`, `idx_layouts_project_id`, `idx_components_layout_id` |
| `20260412_layout_component_columns.sql` | `layouts.color`; `components.visualization`, `components.schema_id` (FK SET NULL), `type` default, re-created `layout_id` FK as `ON DELETE CASCADE` |
| `20260413_component_span.sql` | `components.span` |
| `20260414_role_layouts.sql` | `role_layouts` table + indexes + RLS; rewrote `layouts` SELECT to be role-gated |
| `20260415_fix_layouts_select_policy.sql` | Re-asserted the role-gated `layouts` SELECT (idempotent safety net) |
| `20260416_fix_role_layouts_rls.sql` | `get_project_id_for_layout_unchecked`; rewrote `role_layouts` policies to break RLS recursion |

## Source references

- Migrations: `supabase/migrations/20260404…`, `…12`, `…13`, `…14`, `…15`, `…16`
- Types: `database.types.ts` (`layouts`, `components`, `role_layouts`, `ComponentTypes` enum)
- TS interfaces: `src/shared/api/interface/layout.interface.ts`
