-- Account deletion must never implicitly delete projects belonging to other
-- members. RESTRICT also closes the race between ownership preflight and the
-- Auth admin deletion API: concurrent project creation cannot bypass this FK.
BEGIN;
ALTER TABLE public.projects DROP CONSTRAINT projects_creator_id_fkey;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES auth.users(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE FUNCTION public.prepare_account_deletion()
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Unauthorized';
  END IF;
  -- Fail closed if the FK is ever changed back to cascading deletion.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.projects'::regclass
      AND confrelid = 'auth.users'::regclass
      AND conname = 'projects_creator_id_fkey' AND confdeltype = 'r'
      AND conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute
        WHERE attrelid = 'public.projects'::regclass AND attname = 'creator_id')]
      AND confkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute
        WHERE attrelid = 'auth.users'::regclass AND attname = 'id')]
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Safe account deletion is not configured';
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE creator_id = auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Delete your owned projects before deleting your account';
  END IF;
  RETURN auth.uid();
END;
$$;

CREATE FUNCTION public.list_user_projects()
RETURNS TABLE (id uuid, name text, created_at timestamptz, creator_id uuid, can_delete boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT p.id, p.name, p.created_at, p.creator_id,
    (p.creator_id = auth.uid() OR public.has_permission(p.id, 'delete', 'projects'))
  FROM public.projects p
  WHERE auth.uid() IS NOT NULL AND (
    p.creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = p.id AND up.user_id = auth.uid()
    )
  )
  ORDER BY p.created_at DESC, p.id;
$$;

CREATE FUNCTION public.leave_project(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_creator uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Unauthorized';
  END IF;
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project is required';
  END IF;
  -- Check membership before revealing owner information to a caller.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_projects
    WHERE project_id = p_project_id AND user_id = v_user
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Project membership not found';
  END IF;
  -- Project-first locking prevents a concurrent ownership change or deletion.
  SELECT creator_id INTO v_creator FROM public.projects
    WHERE id = p_project_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Project membership not found';
  END IF;
  IF v_creator = v_user THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Project owners cannot leave their projects';
  END IF;
  -- Match role-swap locking; handle all legacy duplicate memberships.
  PERFORM id FROM public.user_projects
    WHERE project_id = p_project_id AND user_id = v_user ORDER BY id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Project membership not found';
  END IF;
  DELETE FROM public.user_roles ur USING public.roles r
    WHERE ur.role_id = r.id AND r.project_id = p_project_id AND ur.user_id = v_user;
  DELETE FROM public.user_projects
    WHERE project_id = p_project_id AND user_id = v_user;
  RETURN p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_deletion() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_user_projects() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_project(uuid) TO authenticated;
COMMIT;
