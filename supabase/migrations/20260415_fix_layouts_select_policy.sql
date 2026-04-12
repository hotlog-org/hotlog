-- Fix layouts SELECT policy to respect role_layouts + read:layouts permission bypass
DROP POLICY IF EXISTS "layouts_select_member" ON public.layouts;

CREATE POLICY "layouts_select_member"
  ON public.layouts
  FOR SELECT
  TO authenticated
  USING (
    is_project_member(project_id)
    AND (
      -- Public layout (no role restrictions)
      NOT EXISTS (
        SELECT 1 FROM public.role_layouts rl WHERE rl.layout_id = layouts.id
      )
      OR
      -- User has a matching role
      EXISTS (
        SELECT 1
        FROM public.role_layouts rl
        JOIN public.user_roles ur ON ur.role_id = rl.role_id
        WHERE rl.layout_id = layouts.id
          AND ur.user_id = auth.uid()
      )
      OR
      -- Project creator always sees all layouts
      is_project_creator(project_id)
      OR
      -- Users with read:layouts permission see all layouts
      has_permission(project_id, 'read', 'layouts')
    )
  );
