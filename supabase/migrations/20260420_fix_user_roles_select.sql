-- Allow project members with read:users or read:roles to see all user_roles in their projects
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;

CREATE POLICY "user_roles_select"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    -- Always see your own roles
    user_id = auth.uid()
    OR
    -- Users with read:users or read:roles can see all role assignments
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND (
          has_permission(r.project_id, 'read', 'users')
          OR has_permission(r.project_id, 'read', 'roles')
          OR is_project_creator(r.project_id)
        )
    )
  );
