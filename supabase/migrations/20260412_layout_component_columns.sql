-- =============================================================
-- Add missing columns to layouts and components tables
-- =============================================================

-- Add color to layouts (frontend needs it for the colored dot)
ALTER TABLE public.layouts
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#3b82f6';

-- Add visualization type to components (replaces the limited ComponentTypes enum)
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS visualization TEXT NOT NULL DEFAULT 'line';

-- Add schema reference to components (which schema's fields are bound)
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS schema_id UUID REFERENCES public.schemas(id) ON DELETE SET NULL;

-- Give the old `type` column a default so inserts that omit it don't fail
ALTER TABLE public.components
  ALTER COLUMN type SET DEFAULT 'TIME_SERIES';

-- Ensure cascade delete: removing a layout removes its components
ALTER TABLE public.components
  DROP CONSTRAINT IF EXISTS componen_layout_id_fkey,
  ADD CONSTRAINT componen_layout_id_fkey
    FOREIGN KEY (layout_id) REFERENCES public.layouts(id) ON DELETE CASCADE;
