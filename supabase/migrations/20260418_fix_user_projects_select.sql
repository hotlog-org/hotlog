-- Allow project members with read:users (or project creators) to see all memberships
DROP POLICY IF EXISTS "user_projects_select_own" ON public.user_projects;

CREATE POLICY "user_projects_select"
  ON public.user_projects
  FOR SELECT
  TO authenticated
  USING (
    -- Always see your own membership
    user_id = auth.uid()
    OR
    -- Project members with read:users can see all memberships
    has_permission(project_id, 'read', 'users')
    OR
    -- Project creator can see all memberships
    is_project_creator(project_id)
  );
