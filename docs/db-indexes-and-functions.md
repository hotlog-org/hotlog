# Hotlog DB — Indexes & Functions Reference

Inventory of every index and stored function in the `hotlog` Postgres (Supabase) schema, plus the normalization choices we made.

---

## Indexes (44 total)

### Auto-created (you didn't write these)
- **Primary keys (14)** — `*_pkey`, one per table, created automatically to enforce the PK.
- **Unique constraints (7)** — created free by each `UNIQUE` constraint:
  - `api_keys_key_key` (key) · `api_keys_key_hash_idx` (key_hash) · `fields_schema_key_unique` (schema_id, key) · `invitations_token_key` (token) · `permissions_action_subject_unique` (action, subject) · `role_layouts_role_id_layout_id_key` (role_id, layout_id) · `schemas_project_key_unique` (project_id, key)

### Manual performance indexes (the ones we created)
| Index | Table → columns | Purpose |
|---|---|---|
| `events_project_schema_created_idx` | events (project_id, schema_id, created_at DESC) | **Main event feed** — filter by project+schema, newest first, no sort step |
| `idx_events_project_id` | events (project_id) | Project-wide event scans |
| `fields_schema_status_idx` | fields (schema_id, status) | Active fields per schema (soft-delete aware) |
| `idx_fields_schema_id` | fields (schema_id) | Fields per schema |
| `schemas_project_status_idx` | schemas (project_id, status) | Active schemas per project |
| `idx_schemas_project_id` | schemas (project_id) | Schemas per project |
| `idx_api_keys_project_id` | api_keys (project_id) | Keys per project |
| `idx_layouts_project_id` | layouts (project_id) | Layouts per project |
| `idx_components_layout_id` | components (layout_id) | Components per layout |
| `idx_projects_creator_id` | projects (creator_id) | Projects owned by a user |
| `idx_roles_project_id` | roles (project_id) | Roles per project |
| `idx_permissions_action_subject` | permissions (action, subject) | Permission lookup |
| `idx_role_permissions_role_id` | role_permissions (role_id) | Permissions of a role |
| `idx_role_permissions_permission_id` | role_permissions (permission_id) | Roles with a permission |
| `idx_role_layouts_role_id` | role_layouts (role_id) | Layouts of a role |
| `idx_role_layouts_layout_id` | role_layouts (layout_id) | Roles with a layout |
| `idx_user_roles_user_id` | user_roles (user_id) | Roles of a user |
| `idx_user_roles_role_id` | user_roles (role_id) | Users with a role |
| `idx_user_projects_user_id` | user_projects (user_id) | Projects of a user |
| `idx_user_projects_project_id` | user_projects (project_id) | Members of a project |
| `idx_user_projects_user_project` | user_projects (user_id, project_id) | Membership check (RLS) in one probe |
| `invitations_token_idx` | invitations (token) | Invite-link redemption |

### Redundant — safe to drop (7)
A single-column index is dead weight if another index already *leads* with that column (Postgres uses the leftmost prefix):

| Drop | Already covered by |
|---|---|
| `idx_events_project_id` | `events_project_schema_created_idx` |
| `idx_fields_schema_id` | `fields_schema_status_idx` |
| `idx_schemas_project_id` | `schemas_project_status_idx` |
| `idx_user_projects_user_id` | `idx_user_projects_user_project` |
| `idx_role_layouts_role_id` | `role_layouts_role_id_layout_id_key` |
| `invitations_token_idx` | `invitations_token_key` (exact dup) |
| `idx_permissions_action_subject` | `permissions_action_subject_unique` (exact dup) |

> `idx_user_projects_project_id` looks droppable but isn't — its composite leads with `user_id`, so `project_id` is not a usable prefix.

---

## Functions (17 total)

Called from the app via Supabase `.rpc()`. **Security mode** is the key attribute:
- **DEFINER** — runs as the owner, **bypasses RLS** (all set `search_path` to prevent hijacking). For privileged logic or unauthenticated (API-key) calls.
- **INVOKER** — runs as the caller, **RLS applies**. For read-only analytics.

### RLS helpers (DEFINER) — called inside RLS policies, DEFINER avoids recursion
| Function | Returns | Purpose |
|---|---|---|
| `is_project_member(project)` | bool | Is `auth.uid()` a member? |
| `is_project_creator(project)` | bool | Is caller the owner? |
| `has_permission(project, action, subject)` | bool | CASL check via user_roles→roles→role_permissions→permissions; `subject='all'` wildcard |
| `get_project_id_for_schema(schema_id)` | uuid | Resolve parent project for schema-table policies |
| `get_project_id_for_layout(layout_id)` | uuid | Resolve parent project for layout-table policies |
| `get_project_id_for_layout_unchecked(layout_id)` | uuid | Same body as above (variant for an unguarded path) |
| `get_project_id_for_invitation(invitation_id)` | uuid | Resolve parent project for invitation-table policies |

### SDK / ingestion (DEFINER) — authed by API key (sha256 of key → `key_hash`), no `auth.uid()`
| Function | Returns | Purpose |
|---|---|---|
| `ingest_event(api_key, schema_key, value)` | (id, created_at) | **Write path** — verify key → resolve active schema → insert event → bump `last_used_at`. Raises `invalid_api_key` / `schema_not_found` |
| `get_active_fields_for_ingest(api_key, schema_key)` | TABLE(key, type, required, metadata) | Active fields so the SDK can validate before sending |
| `get_project_schemas_for_sdk(api_key)` | jsonb | Full project + schemas + fields catalog as one JSON blob |

### Membership / admin (DEFINER) — self-guard their own permissions
| Function | Returns | Purpose |
|---|---|---|
| `accept_invitation(token)` | json | Validate pending+unexpired token, match email, add to user_projects (+ user_roles), mark accepted; idempotent |
| `update_user_role(project, user, role)` | void | Permission-checked; clears the user's project roles then assigns the new one |
| `get_project_member_emails(project)` | TABLE(user_id, email) | Member emails; empty unless caller `is_project_member` |

### Analytics (INVOKER) — RLS filters rows
| Function | Returns | Purpose |
|---|---|---|
| `events_daily_counts(project, days)` | TABLE(day, count) | Daily series; `generate_series` + LEFT JOIN fills empty days with `0` |
| `project_count()` | int | Caller's project count |
| `project_role_count()` | TABLE(project_name, role_count) | Roles per project |

### Infrastructure (DEFINER, event trigger)
| Function | Returns | Purpose |
|---|---|---|
| `rls_auto_enable()` | event_trigger | Fires on every `CREATE TABLE` in `public`, auto-runs `ENABLE ROW LEVEL SECURITY` — new tables are never left unprotected |

---

## Normalization choices we made (table-level optimizations)

We didn't add denormalized caches or materialized views — normalization is enforced through schema design:

- **key + display_name split** (`schemas`, `fields`) — stable machine `key` (immutable, unique per parent) separated from editable `display_name`, so renames never cascade through referencing data.
- **Junction tables for many-to-many** — `user_projects`, `user_roles`, `role_permissions`, `role_layouts` hold only FKs; no lists-in-columns.
- **Soft delete via `status`** (`schemas`, `fields`, `invitations`) instead of hard delete — preserves referential history; status-composite indexes keep reads fast.
- **JSONB payloads** (`events.value`, `fields.metadata`) — deliberate denormalization for schema-less data; flexibility over relational purity. *(Currently typed `json`, not `jsonb` — would need converting before a GIN index could index inside them.)*
- **FK delete policies encode ownership** — `ON DELETE CASCADE` (events/fields/schemas/api_keys → projects) for owned data; `ON DELETE SET NULL` (`components.schema_id`, `invitations.role_id`) for optional references.
- **Partial unique index** — `invitations_pending_unique (project_id, email) WHERE status='pending'` allows re-inviting after expiry while blocking duplicate pending invites.
