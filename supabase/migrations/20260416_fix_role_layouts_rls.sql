-- Fix infinite recursion: role_layouts RLS → layouts RLS → role_layouts RLS
-- Solution: use SECURITY DEFINER helper to bypass RLS when checking ownership

CREATE OR REPLACE FUNCTION public.get_project_id_for_layout_unchecked(p_layout_id bigint)
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

-- Recreate role_layouts policies using the unchecked helper (bypasses layouts RLS)
DROP POLICY IF EXISTS "role_layouts_select_member" ON public.role_layouts;
DROP POLICY IF EXISTS "role_layouts_insert" ON public.role_layouts;
DROP POLICY IF EXISTS "role_layouts_delete" ON public.role_layouts;

CREATE POLICY "role_layouts_select_member"
  ON public.role_layouts
  FOR SELECT
  TO authenticated
  USING (
    is_project_member(get_project_id_for_layout_unchecked(layout_id))
  );

CREATE POLICY "role_layouts_insert"
  ON public.role_layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_permission(get_project_id_for_layout_unchecked(layout_id), 'update', 'layouts')
  );

CREATE POLICY "role_layouts_delete"
  ON public.role_layouts
  FOR DELETE
  TO authenticated
  USING (
    has_permission(get_project_id_for_layout_unchecked(layout_id), 'update', 'layouts')
  );
