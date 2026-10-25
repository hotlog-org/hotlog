-- Role assignments require membership in the role's project. Existing assignments
-- are retained, but cannot confer permissions after membership is removed.
CREATE OR REPLACE FUNCTION public.has_permission(
  p_project_id uuid,
  p_action text,
  p_subject text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND r.project_id = p_project_id
      AND EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.user_id = ur.user_id AND up.project_id = r.project_id
      )
      AND p.action = p_action
      AND (p.subject = p_subject OR p.subject = 'all')
  );
$$;

-- Enforce the same membership boundary for direct writes and definer callers
-- (including invitations), without changing their existing authorization rules.
-- Bootstrap and invitation acceptance already insert membership before the role.
CREATE OR REPLACE FUNCTION public.require_user_role_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT r.project_id INTO v_project_id
  FROM public.roles r WHERE r.id = NEW.role_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Role does not exist';
  END IF;

  -- Match the RPC's lock order. Membership is not unique in the existing schema,
  -- so lock every matching row deterministically rather than choosing one.
  PERFORM up.id FROM public.user_projects up
  WHERE up.user_id = NEW.user_id AND up.project_id = v_project_id
  ORDER BY up.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'User is not a project member';
  END IF;

  -- Recheck after waiting; SHARE also prevents a concurrent project_id change.
  PERFORM r.id FROM public.roles r
  WHERE r.id = NEW.role_id AND r.project_id = v_project_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Role does not belong to project';
  END IF;

  RETURN NEW;
END;
$$;

-- Check only after RLS authorizes the write: this nonmutating definer check
-- must not disclose or lock memberships for rejected callers. An AFTER trigger
-- exception still rolls back the assignment within the same transaction.
CREATE TRIGGER user_roles_require_membership
AFTER INSERT OR UPDATE OF user_id, role_id ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.require_user_role_membership();

CREATE OR REPLACE FUNCTION public.update_user_role(
  p_project_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Unauthorized';
  END IF;

  IF p_project_id IS NULL OR p_user_id IS NULL OR p_role_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_id, user_id, and role_id are required';
  END IF;

  IF NOT (
    public.is_project_creator(p_project_id)
    OR public.has_permission(p_project_id, 'create', 'users')
    OR public.has_permission(p_project_id, 'update', 'roles')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission denied';
  END IF;

  -- Serialize swaps for this member before deleting any assignment. The locks
  -- also prevent membership deletion/update while this transaction assigns roles.
  PERFORM up.id FROM public.user_projects up
  WHERE up.user_id = p_user_id AND up.project_id = p_project_id
  ORDER BY up.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'User is not a project member';
  END IF;

  PERFORM r.id FROM public.roles r
  WHERE r.id = p_role_id AND r.project_id = p_project_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Role does not belong to project';
  END IF;

  DELETE FROM public.user_roles ur
  USING public.roles r
  WHERE ur.role_id = r.id
    AND ur.user_id = p_user_id
    AND r.project_id = p_project_id;

  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (p_user_id, p_role_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_role(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated, service_role;
-- Trigger execution does not require callers to have direct EXECUTE permission.
REVOKE ALL ON FUNCTION public.require_user_role_membership() FROM PUBLIC, anon, authenticated, service_role;
