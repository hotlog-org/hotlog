-- Add span column to components for side-by-side layout
-- 'full' = takes full width (default, stacked)
-- 'half' = takes half width (two consecutive halves sit side by side)
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS span TEXT NOT NULL DEFAULT 'full';
