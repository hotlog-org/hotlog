-- =============================================================
-- RLS Policies for Hotlog Database
-- =============================================================
-- Enables Row-Level Security on all 12 public tables with
-- project-scoped access control and RBAC permission enforcement.
-- Idempotent — safe to re-run.
-- =============================================================


-- =============================================================
-- Drop existing policies (idempotent re-run support)
-- =============================================================

DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_authenticated" ON public.projects;
DROP POLICY IF EXISTS "projects_update_creator" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_creator" ON public.projects;

DROP POLICY IF EXISTS "user_projects_select_own" ON public.user_projects;
DROP POLICY IF EXISTS "user_projects_insert_self_as_creator" ON public.user_projects;
DROP POLICY IF EXISTS "user_projects_delete" ON public.user_projects;

DROP POLICY IF EXISTS "roles_select_member" ON public.roles;
DROP POLICY IF EXISTS "roles_insert" ON public.roles;
DROP POLICY IF EXISTS "roles_update" ON public.roles;
DROP POLICY IF EXISTS "roles_delete" ON public.roles;

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

DROP POLICY IF EXISTS "permissions_select_authenticated" ON public.permissions;

DROP POLICY IF EXISTS "role_permissions_select_member" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_delete" ON public.role_permissions;

DROP POLICY IF EXISTS "schemas_select_member" ON public.schemas;
DROP POLICY IF EXISTS "schemas_insert" ON public.schemas;
DROP POLICY IF EXISTS "schemas_update" ON public.schemas;
DROP POLICY IF EXISTS "schemas_delete" ON public.schemas;

DROP POLICY IF EXISTS "fields_select_member" ON public.fields;
DROP POLICY IF EXISTS "fields_insert" ON public.fields;
DROP POLICY IF EXISTS "fields_update" ON public.fields;
DROP POLICY IF EXISTS "fields_delete" ON public.fields;

DROP POLICY IF EXISTS "events_select_member" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;

DROP POLICY IF EXISTS "layouts_select_member" ON public.layouts;
DROP POLICY IF EXISTS "layouts_insert" ON public.layouts;
DROP POLICY IF EXISTS "layouts_update" ON public.layouts;
DROP POLICY IF EXISTS "layouts_delete" ON public.layouts;

DROP POLICY IF EXISTS "components_select_member" ON public.components;
DROP POLICY IF EXISTS "components_insert" ON public.components;
DROP POLICY IF EXISTS "components_update" ON public.components;
DROP POLICY IF EXISTS "components_delete" ON public.components;

DROP POLICY IF EXISTS "api_keys_select" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON public.api_keys;


-- =============================================================
-- SECTION A: Helper Functions (SECURITY DEFINER)
-- =============================================================

-- A1: Check if the current user is a member of a project.
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_projects
    WHERE user_id = auth.uid()
      AND project_id = p_project_id
  );
$$;

-- A2: Check if the current user has a specific permission in a project.
CREATE OR REPLACE FUNCTION public.has_permission(
  p_project_id uuid,
  p_action text,
  p_subject text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND r.project_id = p_project_id
      AND p.action = p_action
      AND p.subject = p_subject
  );
$$;

-- A3: Resolve project_id from a schema_id (for fields table).
CREATE OR REPLACE FUNCTION public.get_project_id_for_schema(p_schema_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id
  FROM public.schemas
  WHERE id = p_schema_id;
$$;

-- A4: Resolve project_id from a layout_id (for components table).
CREATE OR REPLACE FUNCTION public.get_project_id_for_layout(p_layout_id int8)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id
  FROM public.layouts
  WHERE id = p_layout_id;
$$;

-- A5: Check if the current user is the creator of a project.
CREATE OR REPLACE FUNCTION public.is_project_creator(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
      AND creator_id = auth.uid()
  );
$$;


-- =============================================================
-- SECTION B: Enable RLS on All Tables
-- =============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- Grant table privileges to the authenticated role.
-- RLS is the security boundary, but PostgREST still requires
-- table-level GRANTs for authenticated users to reach them.
-- =============================================================

GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.user_projects TO authenticated;
GRANT ALL ON public.roles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.role_permissions TO authenticated;
GRANT ALL ON public.schemas TO authenticated;
GRANT ALL ON public.fields TO authenticated;
GRANT ALL ON public.events TO authenticated;
GRANT ALL ON public.layouts TO authenticated;
GRANT ALL ON public.components TO authenticated;
GRANT ALL ON public.api_keys TO authenticated;

-- Also grant usage on sequences (for int8 PK tables)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- =============================================================
-- SECTION C: projects
-- =============================================================

CREATE POLICY "projects_select_member"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    is_project_member(id)
    OR creator_id = auth.uid()
  );

CREATE POLICY "projects_insert_authenticated"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
  );

CREATE POLICY "projects_update_creator"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "projects_delete_creator"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());


-- =============================================================
-- SECTION D: user_projects
-- =============================================================

CREATE POLICY "user_projects_select_own"
  ON public.user_projects
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_projects_insert_self_as_creator"
  ON public.user_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_project_creator(project_id)
  );

CREATE POLICY "user_projects_delete"
  ON public.user_projects
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_project_creator(project_id)
  );


-- =============================================================
-- SECTION E: roles
-- =============================================================

CREATE POLICY "roles_select_member"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "roles_insert"
  ON public.roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_creator(project_id)
    OR has_permission(project_id, 'create', 'roles')
  );

CREATE POLICY "roles_update"
  ON public.roles
  FOR UPDATE
  TO authenticated
  USING (has_permission(project_id, 'update', 'roles'))
  WITH CHECK (has_permission(project_id, 'update', 'roles'));

CREATE POLICY "roles_delete"
  ON public.roles
  FOR DELETE
  TO authenticated
  USING (has_permission(project_id, 'delete', 'roles'));


-- =============================================================
-- SECTION F: user_roles
-- =============================================================

CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_insert"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Bootstrap: creator assigning a role to themselves
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.roles r
        WHERE r.id = role_id
          AND is_project_creator(r.project_id)
      )
    )
    OR
    -- General: user with permission to manage users in the project
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND has_permission(r.project_id, 'create', 'users')
    )
  );

CREATE POLICY "user_roles_delete"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND has_permission(r.project_id, 'delete', 'users')
    )
  );


-- =============================================================
-- SECTION G: permissions (static lookup table)
-- =============================================================

CREATE POLICY "permissions_select_authenticated"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);


-- =============================================================
-- SECTION H: role_permissions
-- =============================================================

CREATE POLICY "role_permissions_select_member"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND is_project_member(r.project_id)
    )
  );

CREATE POLICY "role_permissions_insert"
  ON public.role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND (
          is_project_creator(r.project_id)
          OR has_permission(r.project_id, 'update', 'roles')
        )
    )
  );

CREATE POLICY "role_permissions_delete"
  ON public.role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND has_permission(r.project_id, 'update', 'roles')
    )
  );


-- =============================================================
-- SECTION I: schemas
-- =============================================================

CREATE POLICY "schemas_select_member"
  ON public.schemas
  FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "schemas_insert"
  ON public.schemas
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(project_id, 'create', 'schemas'));

CREATE POLICY "schemas_update"
  ON public.schemas
  FOR UPDATE
  TO authenticated
  USING (has_permission(project_id, 'update', 'schemas'))
  WITH CHECK (has_permission(project_id, 'update', 'schemas'));

CREATE POLICY "schemas_delete"
  ON public.schemas
  FOR DELETE
  TO authenticated
  USING (has_permission(project_id, 'delete', 'schemas'));


-- =============================================================
-- SECTION J: fields
-- =============================================================

CREATE POLICY "fields_select_member"
  ON public.fields
  FOR SELECT
  TO authenticated
  USING (is_project_member(get_project_id_for_schema(schema_id)));

CREATE POLICY "fields_insert"
  ON public.fields
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(get_project_id_for_schema(schema_id), 'create', 'fields'));

CREATE POLICY "fields_update"
  ON public.fields
  FOR UPDATE
  TO authenticated
  USING (has_permission(get_project_id_for_schema(schema_id), 'update', 'fields'))
  WITH CHECK (has_permission(get_project_id_for_schema(schema_id), 'update', 'fields'));

CREATE POLICY "fields_delete"
  ON public.fields
  FOR DELETE
  TO authenticated
  USING (has_permission(get_project_id_for_schema(schema_id), 'delete', 'fields'));


-- =============================================================
-- SECTION K: events
-- =============================================================

CREATE POLICY "events_select_member"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "events_insert"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(project_id, 'create', 'events'));

CREATE POLICY "events_update"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (has_permission(project_id, 'update', 'events'))
  WITH CHECK (has_permission(project_id, 'update', 'events'));

CREATE POLICY "events_delete"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (has_permission(project_id, 'delete', 'events'));


-- =============================================================
-- SECTION L: layouts
-- =============================================================

CREATE POLICY "layouts_select_member"
  ON public.layouts
  FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "layouts_insert"
  ON public.layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(project_id, 'create', 'layouts'));

CREATE POLICY "layouts_update"
  ON public.layouts
  FOR UPDATE
  TO authenticated
  USING (has_permission(project_id, 'update', 'layouts'))
  WITH CHECK (has_permission(project_id, 'update', 'layouts'));

CREATE POLICY "layouts_delete"
  ON public.layouts
  FOR DELETE
  TO authenticated
  USING (has_permission(project_id, 'delete', 'layouts'));


-- =============================================================
-- SECTION M: components
-- =============================================================

CREATE POLICY "components_select_member"
  ON public.components
  FOR SELECT
  TO authenticated
  USING (is_project_member(get_project_id_for_layout(layout_id)));

CREATE POLICY "components_insert"
  ON public.components
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(get_project_id_for_layout(layout_id), 'create', 'components'));

CREATE POLICY "components_update"
  ON public.components
  FOR UPDATE
  TO authenticated
  USING (has_permission(get_project_id_for_layout(layout_id), 'update', 'components'))
  WITH CHECK (has_permission(get_project_id_for_layout(layout_id), 'update', 'components'));

CREATE POLICY "components_delete"
  ON public.components
  FOR DELETE
  TO authenticated
  USING (has_permission(get_project_id_for_layout(layout_id), 'delete', 'components'));


-- =============================================================
-- SECTION N: api_keys (permission-gated even for SELECT)
-- =============================================================

CREATE POLICY "api_keys_select"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (has_permission(project_id, 'read', 'api_keys'));

CREATE POLICY "api_keys_insert"
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(project_id, 'create', 'api_keys'));

CREATE POLICY "api_keys_update"
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (has_permission(project_id, 'update', 'api_keys'))
  WITH CHECK (has_permission(project_id, 'update', 'api_keys'));

CREATE POLICY "api_keys_delete"
  ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (has_permission(project_id, 'delete', 'api_keys'));


-- =============================================================
-- SECTION O: Performance Indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_user_projects_user_id
  ON public.user_projects (user_id);

CREATE INDEX IF NOT EXISTS idx_user_projects_project_id
  ON public.user_projects (project_id);

CREATE INDEX IF NOT EXISTS idx_user_projects_user_project
  ON public.user_projects (user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
  ON public.user_roles (role_id);

CREATE INDEX IF NOT EXISTS idx_roles_project_id
  ON public.roles (project_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id
  ON public.role_permissions (role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON public.role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_permissions_action_subject
  ON public.permissions (action, subject);

CREATE INDEX IF NOT EXISTS idx_schemas_project_id
  ON public.schemas (project_id);

CREATE INDEX IF NOT EXISTS idx_fields_schema_id
  ON public.fields (schema_id);

CREATE INDEX IF NOT EXISTS idx_events_project_id
  ON public.events (project_id);

CREATE INDEX IF NOT EXISTS idx_layouts_project_id
  ON public.layouts (project_id);

CREATE INDEX IF NOT EXISTS idx_components_layout_id
  ON public.components (layout_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_project_id
  ON public.api_keys (project_id);

CREATE INDEX IF NOT EXISTS idx_projects_creator_id
  ON public.projects (creator_id);
