-- =============================================================
-- has_permission: honor the `subject = 'all'` wildcard
-- =============================================================
-- The original function did an exact subject match, so a role with
-- e.g. delete:all couldn't actually delete events, schemas, etc. The
-- frontend (CASL) already treats 'all' as a wildcard subject, so this
-- migration brings the SQL function in line with the frontend.
--
-- The wildcard is only on the subject; we still require the action to
-- match exactly (so create:all does NOT grant delete:events).
-- =============================================================

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
      AND (p.subject = p_subject OR p.subject = 'all')
  );
$$;
