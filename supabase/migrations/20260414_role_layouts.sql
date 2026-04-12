-- =============================================================
-- role_layouts: restrict layout visibility by role
-- =============================================================
-- If a layout has NO rows in role_layouts → "public" (visible to all members)
-- If a layout HAS rows in role_layouts → only users with a matching role can see it

CREATE TABLE IF NOT EXISTS public.role_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  layout_id BIGINT NOT NULL REFERENCES public.layouts(id) ON DELETE CASCADE,
  UNIQUE (role_id, layout_id)
);

ALTER TABLE public.role_layouts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.role_layouts TO authenticated;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_role_layouts_layout_id
  ON public.role_layouts (layout_id);
CREATE INDEX IF NOT EXISTS idx_role_layouts_role_id
  ON public.role_layouts (role_id);

-- RLS: anyone who is a project member can read role_layouts
-- (needed so the API can check which roles are assigned)
CREATE POLICY "role_layouts_select_member"
  ON public.role_layouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.layouts l
      WHERE l.id = layout_id
        AND is_project_member(l.project_id)
    )
  );

-- Insert/delete require update:layouts permission
CREATE POLICY "role_layouts_insert"
  ON public.role_layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.layouts l
      WHERE l.id = layout_id
        AND has_permission(l.project_id, 'update', 'layouts')
    )
  );

CREATE POLICY "role_layouts_delete"
  ON public.role_layouts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.layouts l
      WHERE l.id = layout_id
        AND has_permission(l.project_id, 'update', 'layouts')
    )
  );

-- =============================================================
-- Update layouts SELECT policy: respect role_layouts
-- =============================================================
-- A member can see a layout if:
--   1) The layout is "public" (no rows in role_layouts), OR
--   2) The user has at least one role that is in role_layouts for that layout

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
